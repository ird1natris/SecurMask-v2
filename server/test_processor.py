import io
import os
import unittest
import csv
os.environ["PROCESSOR_SECRET"] = "test-processor-secret-with-at-least-32-chars"
from main_app import main_app
from openpyxl import Workbook

class ProcessorTests(unittest.TestCase):
    def setUp(self):
        self.client = main_app.test_client()
        self.headers = {"X-Processor-Secret": os.environ["PROCESSOR_SECRET"]}
    def upload(self, route, content, name="file.CSV"):
        return self.client.post(route, data={"file": (io.BytesIO(content), name)}, headers=self.headers)
    def test_private_access_and_health(self):
        self.assertEqual(self.client.get("/health").status_code, 200)
        self.assertEqual(self.client.post("/process_file").status_code, 401)
    def test_preserves_values_and_unselected_columns(self):
        content = b"name,code,big,empty,literal\nAlice,00123,12345678901234567890,,NA\n"
        response = self.upload("/process_file",content)
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.data,content)
        masked = self.client.post("/apply_masking_rules",json={"content":content.decode(),"contentFormat":"raw_csv","columnsToMask":["name"]},headers=self.headers)
        self.assertEqual(masked.status_code,200)
        row = list(csv.reader(io.StringIO(masked.json["maskedContent"])))[1]
        self.assertNotEqual(row[0],"Alice")
        self.assertEqual(row[1:],["00123","12345678901234567890","","NA"])
    def test_xlsx_text_cells_and_validation(self):
        book=Workbook();sheet=book.active;sheet.append(["name","code"]);sheet.append(["Alice","00123"])
        data=io.BytesIO();book.save(data)
        response=self.upload("/process_file",data.getvalue(),"file.xlsx")
        self.assertEqual(response.status_code,200)
        self.assertIn(b"00123",response.data)
        self.assertEqual(self.upload("/process_file",b"invalid","bad.xlsx").status_code,400)
        self.assertEqual(self.upload("/detect_columns",b"a,b\n1,2").json["columns"],["a","b"])
    def test_invalid_mask_selection_and_request_limit(self):
        response=self.client.post("/apply_masking_rules",json={"content":"a\n1","columnsToMask":["missing"]},headers=self.headers)
        self.assertEqual(response.status_code,400)
        response=self.client.post("/process_file",data=b"x"*(12*1024*1024+1),headers=self.headers)
        self.assertEqual(response.status_code,413)

if __name__ == "__main__":
    unittest.main()
