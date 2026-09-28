import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import axios from 'axios';
import FormData from 'form-data';

const keyFor = key => crypto.createHash('sha256').update(key).digest();
function decrypt(data, key, iv) {
    try {
        const cipher = crypto.createDecipheriv('aes-256-cbc', keyFor(key), iv);
        return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
    } catch {
        throw Object.assign(new Error('Invalid decryption key'), { status: 400 });
    }
}
const requireKey = key => {
    if (typeof key !== 'string' || key.length < 8) {
        throw Object.assign(new Error('Encryption key must be at least 8 characters long'), { status: 400 });
    }
};
const sign = (content, number, secret) => crypto.createHmac('sha256', secret)
    .update(content + '-' + number + '-' + secret).digest('base64');

export function createProcessor(base = process.env.FLASK_URL || 'http://127.0.0.1:5000') {
    async function sendFile(endpoint, bytes, name) {
        const form = new FormData();
        form.append('file', bytes, { filename: name });
        const { data } = await axios.post(base + endpoint, form, { headers: { ...form.getHeaders(), 'X-Processor-Secret': process.env.PROCESSOR_SECRET || '' }, timeout: 120000, maxContentLength: 12 * 1024 * 1024, maxBodyLength: 12 * 1024 * 1024 });
        return data;
    }
    return {
        detect: (bytes, name) => sendFile('/detect_columns', bytes, name),
        process: (bytes, name) => sendFile('/process_file', bytes, name),
        recover: bytes => sendFile('/deProcessFile', bytes, 'decrypted_file.csv'),
        async mask(content, columnsToMask, contentFormat) {
            const { data } = await axios.post(base + '/apply_masking_rules', { content, columnsToMask, contentFormat }, { headers: { 'X-Processor-Secret': process.env.PROCESSOR_SECRET || '' }, timeout: 120000, maxContentLength: 12 * 1024 * 1024 });
            return data.maskedContent;
        },
    };
}

export function createFileRouter({ repository, authenticate, processor = createProcessor(), secret = process.env.SECRET_KEY, maxBytes = 10 * 1024 * 1024 }) {
    const router = express.Router();
    const paths = ['/detect_columns', '/upload', '/mask', '/file', '/generate-signature', '/verify-signature', '/deleteFile'];
    router.use(paths, authenticate, (req, res, next) => {
        if (!req.user?.user_id) return res.status(401).json({ message: 'User not authenticated' });
        next();
    });
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: maxBytes, files: 1, fields: 10, fieldSize: 64 * 1024 },
        fileFilter(req, file, done) {
            if (!/\.(csv|xlsx)$/i.test(file.originalname)) {
                return done(Object.assign(new Error('Only CSV and XLSX files are supported'), { status: 400 }));
            }
            done(null, true);
        },
    });
    const run = handler => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
    router.post('/detect_columns', upload.single('file'), run(async (req, res) => {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        res.json(await processor.detect(req.file.buffer, req.file.originalname));
    }));
    router.post('/upload', upload.single('file'), run(async (req, res) => {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        requireKey(req.body.key);
        const processed = await processor.process(req.file.buffer, req.file.originalname);
        if (typeof processed !== 'string') throw new Error('Processor returned invalid content');
        const bytes = Buffer.from(processed.replace(/\r\n/g, '\n'), 'utf8');
        if (bytes.length > maxBytes) return res.status(413).json({ message: 'Processed file exceeds size limit' });
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', keyFor(req.body.key), iv);
        const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
        const fileId = await repository.create(req.user.user_id, req.file.originalname, encrypted, iv);
        res.status(200).json({ message: 'File uploaded, processed, and encrypted successfully', fileId, fileName: req.file.originalname });
    }));
    router.post('/mask', run(async (req, res) => {
        requireKey(req.body.key);
        const row = await repository.read(req.body.fileId, req.user.user_id);
        const content = decrypt(row.file_data, req.body.key, row.iv);
        const masked = await processor.mask(content, req.body.columnsToMask, row.content_format);
        if (typeof masked !== 'string') throw new Error('Processor returned invalid content');
        if (Buffer.byteLength(masked) > maxBytes) return res.status(413).json({ message: 'Processed file exceeds size limit' });
        await repository.saveMasked(row.file_id, req.user.user_id, Buffer.from(masked));
        res.json({ content: masked, message: 'Masked data saved successfully' });
    }));
    router.post('/file', run(async (req, res) => {
        requireKey(req.body.decryptionKey);
        const row = await repository.read(req.body.fileId, req.user.user_id);
        const content = decrypt(row.file_data, req.body.decryptionKey, row.iv);
        const recovered = row.content_format === 'raw_csv' ? content : await processor.recover(Buffer.from(content));
        if (!recovered) throw new Error('Processor returned empty content');
        res.json({ content: recovered, message: 'Successfully unmasked the data' });
    }));
    router.post('/generate-signature', run(async (req, res) => {
        const { fileId, fileContent } = req.body;
        if (typeof fileContent !== 'string') return res.status(400).json({ message: 'File content is required' });
        const random = crypto.randomBytes(16).toString('hex');
        const signature = sign(fileContent, random, secret);
        await repository.saveSignature(fileId, req.user.user_id, signature, random);
        res.json({ signature });
    }));
    router.post('/verify-signature', run(async (req, res) => {
        const row = await repository.signature(req.body.fileId, req.user.user_id);
        const { fileContent, signature } = req.body;
        if (typeof fileContent !== 'string' || !row.digital_signature || signature !== row.digital_signature ||
            sign(fileContent, row.random_number, secret) !== row.digital_signature) {
            return res.status(400).json({ message: 'File content or signature is invalid.' });
        }
        res.json({ isValid: true, message: 'Signature is valid.' });
    }));
    router.delete('/deleteFile', run(async (req, res) => {
        await repository.remove(req.body.id, req.user.user_id);
        res.json({ message: 'File deleted successfully.' });
    }));
    router.use((error, req, res, next) => {
        if (error instanceof multer.MulterError) {
            return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: 'Upload exceeds the allowed limits' });
        }
        if (error.status) return res.status(error.status).json({ message: error.message });
        if (error.response && [400, 413, 422].includes(error.response.status)) {
            return res.status(error.response.status).json({ message: 'The file could not be processed. Check its format and size.' });
        }
        console.error('File operation failed:', error.code || error.name);
        res.status(500).json({ message: 'File operation failed. Please try again.' });
    });
    return router;
}
