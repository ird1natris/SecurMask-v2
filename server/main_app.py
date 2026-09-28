import random
import string
from datetime import datetime

from fuzzywuzzy import fuzz
import pandas as pd
from flask import Flask, request, jsonify
import os
from werkzeug.utils import secure_filename
from io import BytesIO, StringIO
from flask import Response
from faker import Faker
import csv
import io
import re
from collections import defaultdict
import hmac
import zipfile
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).with_name(".env"))

# Initialize Flask app
main_app = Flask(__name__)
main_app.config["MAX_CONTENT_LENGTH"] = 12 * 1024 * 1024
PROCESSOR_SECRET = os.environ.get("PROCESSOR_SECRET", "")
if os.environ.get("NODE_ENV") == "production" and len(PROCESSOR_SECRET) < 32:
    raise RuntimeError("PROCESSOR_SECRET must contain at least 32 characters")

@main_app.before_request
def authorize():
    if request.content_length and request.content_length > main_app.config["MAX_CONTENT_LENGTH"]:
        return jsonify({"error": "Request too large"}), 413
    if request.path != "/health" and (not PROCESSOR_SECRET or not hmac.compare_digest(
            request.headers.get("X-Processor-Secret", ""), PROCESSOR_SECRET)):
        return jsonify({"error": "Unauthorized"}), 401

@main_app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "classifile-processor"})

# Initialize Faker
fake = Faker()
# Dictionary to store gender pseudonym mappings
gender_pseudonym_mapping = defaultdict(lambda: None)
gender_counter = 1  # Counter for pseudonymized values

# Dictionary to store religion pseudonym mappings
religion_pseudonym_mapping = defaultdict(lambda: None)
religion_counter = 1  # Counter for pseudonymized values

# Dictionary to store race pseudonym mappings
race_pseudonym_mapping = defaultdict(lambda: None)
race_counter = 1  # Counter for pseudonymized values
# List of keywords to match column names for sensitive data types
# Define column header keywords for IC number
IC_KEYWORDS = ['ic', 'identification', 'id', 'passport', 'ssn', 'personal id', 'national id', 'ic number', 'IC', 'mykad']

# Define column header keywords for email
EMAIL_KEYWORDS = ['email', 'email_id', 'contact', 'e-mail', 'contact email', 'emel']

# Define column header keywords for address
ADDRESS_KEYWORDS = ['address', 'home address', 'residence', 'location', 'street', 'city', 'place of residence', 'alamat', 'rumah']

# Define column header keywords for age
AGE_KEYWORDS = ['age', 'umur']

# Define column header keywords for name
NAME_KEYWORDS = ['name', 'full name', 'first name', 'last name', 'first', 'surname', 'nama', 'penuh', 'given name', 'fname', 'lname']

# Define column header keywords for phone numbers
PHONE_KEYWORDS = ['phone', 'mobile', 'contact', 'telephone', 'cell', 'telefon', 'tel']

# Define column header keywords for Place of Birth
PLACE_OF_BIRTH_KEYWORDS = ['place', 'origin', 'tempat', 'state']

# Define column header keywords for Birth Date
BIRTH_DATE_KEYWORDS = ['date', 'dob', 'b-day', 'd.o.b.', 'tarikh', 'birth date','birthdate']

GENDER_KEYWORDS = ['gender', 'sex', 'jenis kelamin', 'j.k.', 'sex/gender', 'gen', 'jantina']

HEALTH_STATUS_KEYWORDS = ['health', 'status', 'health status', 'medical condition', 
                          'condition', 'health state', 'state of health', 'tahap kesihatan']

# Define column header keywords for Religion
RELIGION_KEYWORDS = ['religion', 'faith', 'religious', 'religion type', 'belief', 'agama', 'kepercayaan']

# Define column header keywords for Race
RACE_KEYWORDS = ['race', 'ethnicity', 'ethnic group', 'race/ethnicity', 'bangsa', 'kaum']

# Define column header keywords for Race
SALARY_KEYWORDS = ['salary', 'income', 'gaji', 'pendapatan', 'source']

CREDIT_CARD_KEYWORDS = ['credit card', 'cc_number', 'kredit', 'debit']



# Path constants
#UPLOAD_FOLDER_ORIGINAL = "uploads/original"  # Adjust as necessary
#PROCESSED_FOLDER = "uploads/processed"  # Adjust as necessary
ALLOWED_EXTENSIONS = {'csv', 'xlsx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def sanitize_filename(filename):
    return secure_filename(filename)
# Utility function to preprocess column names
def preprocess_column_name(column_name):
    return column_name.lower()
####################################################################################
#CIPHER DATA BEFORE MASKING
from datetime import datetime, timedelta

def convert_excel_date(excel_date):
    """ Convert Excel serial date to Python datetime object. """
    # Excel date starts from 1900-01-01, but Excel incorrectly treats 1900 as a leap year.
    excel_epoch = datetime(1900, 1, 1)
    return excel_epoch + timedelta(days=excel_date - 2)

def cipher_date(date_value):
    """ Cipher the date by adding 5 to the day and 7 to the month. """
    try:
        # If date_value is numeric (Excel serial date)
        if isinstance(date_value, (int, float)):
            date_value = convert_excel_date(date_value)

        elif isinstance(date_value, str):
            # Handle string dates, attempt parsing with multiple formats
            formats = ["%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%Y-%m-%d"]  # Common formats
            for fmt in formats:
                try:
                    date_value = datetime.strptime(date_value, fmt)
                    break  # Successfully parsed, exit the loop
                except ValueError:
                    continue
            else:
                raise ValueError(f"Unrecognized date format: {date_value}")

        # Add 5 to the day and mod 30 (ensure day is 1-30)
        new_day = (date_value.day + 5 - 1) % 30 + 1
        
        # Add 7 to the month and mod 12 (ensure month is 1-12)
        new_month = (date_value.month + 7 - 1) % 12 + 1
        
        # Return the ciphered date with '.' as the delimiter
        return f"{new_day}.{new_month}.{date_value.year}"
    
    except Exception as e:
        return f"Error masking date: {e}"


# Cipher for Phone Number
def cipher_phone_number(phone_number):
    """Cipher the phone number by modifying the last 4 digits."""
    try:
        # Remove the '+' sign if it exists
        phone_number = re.sub(r"\+", "", phone_number)
        # Normalize the phone number to a consistent format with only digits and hyphens
        phone_number = re.sub(r"[^\d-]", "", phone_number)  # Remove spaces or other characters
        
        # Split the phone number into main part and last part
        parts = phone_number.rsplit('-', maxsplit=1)
        main_part, last_part = parts[0], parts[1] if len(parts) > 1 else ""
        
        if len(last_part) < 4:
            return f"Error: Last part of phone number must have at least 4 digits"
        
        # Extract the last 4 digits
        last_4_digits = [int(digit) for digit in last_part[-4:]]
        
        # Cipher the last 4 digits
        modified_digits = [last_4_digits[-1]]  # Move the last digit to the front
        for digit in last_4_digits[:3]:
            modified_digits.append((digit + 4) % 10)  # Add 4 (mod 10)
        
        # Replace the last 4 digits in the phone number
        new_last_part = last_part[:-4] + ''.join(map(str, modified_digits))
        return f"{main_part}-{new_last_part}"
    except Exception as e:
        return f"Error cipher phone number: {e}"

import random
import string

# Function to generate random letters before and after the character
def random_letters(char):
    before = ''.join(random.choices(string.ascii_uppercase, k=2))
    after = ''.join(random.choices(string.ascii_uppercase, k=2))
    return before + char + after

# Function to shift a character by a given number (Caesar cipher shift)
def shift_character(c, shift_amount):
    if c.isalpha():
        base = ord('A') if c.isupper() else ord('a')
        return chr((ord(c) - base + shift_amount) % 26 + base)
    return c

# Function to apply the cipher technique to a name
def cipher_name(name, shift_amount=5):
    try:
        # Step 1: Add random letters before and after each character
        cipher = ''.join(random_letters(c) for c in name)
    
        # Step 2: Apply the Caesar shift of 'shift_amount' (5) to each character
        cipher_with_shift = ''.join(shift_character(c, shift_amount) for c in cipher)
        
        return cipher_with_shift
    except Exception as e:
        return f"Error cipher name: {e}"

# Cipher for IC (Identity Card Number)
def cipher_numeric(id_number):
    try:
        # Ensure the id_number is treated as a string
        id_number = str(id_number).replace(" ", "").replace("-", "")

        def modify_four_digits(four_digits):
            # Extract last digit and put it first, modify first three digits by adding 5
            last_digit = four_digits[-1]
            modified_digits = [last_digit]  # Start with the last digit
            for digit in four_digits[:3]:
                new_digit = (int(digit) + 5) % 10
                modified_digits.append(new_digit)
            return ''.join(map(str, modified_digits))

        if len(id_number) < 8:
            # Only cipher the last 4 digits if the ID number is less than 6 characters
            last_4_digits = id_number[-4:]
            new_last_4 = modify_four_digits(last_4_digits)
            middle_digits = id_number[:-4]  # Everything before the last 4 digits
            ciphered_id = middle_digits + new_last_4
        else:
            # Split the ID number into sections
            first_4_digits = id_number[:4]
            middle_digits = id_number[4:-4]
            last_4_digits = id_number[-4:]

            # Modify the first and last 4 digits of the ID number
            new_first_4 = modify_four_digits(first_4_digits)
            new_last_4 = modify_four_digits(last_4_digits)

            # Combine the modified sections back together
            ciphered_id = new_first_4 + middle_digits + new_last_4

        return str(ciphered_id)  # Return as a string
    except Exception as e:
        return f"Error cipher id number: {e}"




# Cipher for Email
def generate_random_letters():
    """
    Generate a random two-letter string before and after a given letter.
    """
    before = ''.join(random.choices(string.ascii_lowercase, k=2))
    after = ''.join(random.choices(string.ascii_lowercase, k=2))
    return before, after

def cipher_email(email):
    """
    Cipher the email by modifying the part before '@'.
    """
    try:
        name_before_at = email.split('@')[0]
        ciphered_name = ""
    
        # Add random letters and shift each letter
        for letter in name_before_at:
            before, after = generate_random_letters()
            ciphered_letter = before + letter + after
            
            # Shift the letter by 6 positions (using Caesar cipher logic)
            shifted_ciphered = ''.join([chr(((ord(ch) - 97 + 6) % 26) + 97) if 'a' <= ch <= 'z' else ch for ch in ciphered_letter])
            ciphered_name += shifted_ciphered
    
        # Rebuild the email with the ciphered name
        return f"{ciphered_name}@{email.split('@')[1]}"
    except Exception as e:
        return f"Error cipher email: {e}"
    


def preprocess_credit_card_number(cc_number):
    """ Clean and format the credit card number. """
    try:
        # Handle scientific notation if input is float-like
        if isinstance(cc_number, (float, int)):
            cc_number = f"{int(cc_number):d}"  # Convert to integer string
        
        # Ensure cc_number is a string
        cc_number = str(cc_number).replace(" ", "").replace("-", "")  # Remove spaces/dashes
        
        # Validate that cc_number contains only digits
        if not cc_number.isdigit():
            raise ValueError("Credit card number must contain only digits.")
        
        return cc_number
    except Exception as e:
        return f"Error preprocessing credit card number: {e}"


def cipher_credit_card(cc_number):
    """ Cipher the credit card number by keeping the first 6 and last 4 digits,
        and replacing the middle digits with transformed values. """
    try:
        # Convert scientific notation to a full integer if input is float-like
        if isinstance(cc_number, (float, int)):
            cc_number = f"{int(cc_number):d}"  # Convert to integer string
        
        # Ensure cc_number is a string
        cc_number = str(cc_number).replace(" ", "").replace("-", "")  # Remove spaces/dashes
        
        # Validate that cc_number contains only digits
        if not cc_number.isdigit():
            raise ValueError("Credit card number must contain only digits.")
        
        # Validate length of credit card number
        if len(cc_number) < 10:
            raise ValueError("Credit card number is too short to process.")
        
        # Get the last 4 digits of the credit card number
        last_4_digits = cc_number[-4:]
        
        # Use the last digit of the last 4 digits for the ciphering transformation
        key_digit = int(last_4_digits[-1])  # Take the last digit
        
        # Cipher the digits
        ciphered_digits = [key_digit]  # Start with the key digit
        
        for digit in last_4_digits[:3]:  # Only for the first 3 digits
            new_digit = (int(digit) + key_digit) % 10  # Add and mod 10 if necessary
            ciphered_digits.append(new_digit)
        
        # Return the ciphered last 4 digits as part of the original credit card number
        return cc_number[:-4] + ''.join(map(str, ciphered_digits))
    
    except Exception as e:
        return f"Error masking credit card number: {e}"

###########################################################################################################
#decipher techniques
def decipher_date(date_value):
    """ Decipher the date by reversing the ciphered operations. """
    try:
        # Replace '.' with '/' to standardize the delimiter
        date_value = date_value.replace('.', '/')
        
        # Split the date string into day, month, and year
        day, month, year = map(int, date_value.split('/'))
        
        # Subtract 5 from the day and mod 30 (ensure day is 1-30)
        day = (day - 5 - 1) % 30 + 1
        
        # Subtract 7 from the month and mod 12 (ensure month is 1-12)
        month = (month - 7 - 1) % 12 + 1
        
        # Return the deciphered date with '/' as the delimiter
        return f"{day}/{month}/{year}"
    except Exception as e:
        return f"Error deciphering date: {e}"


# Decipher for Phone Number
def decipher_phone_number(phone_number):
    """Decipher the phone number by reversing the cipher."""
    try:
        # Normalize the phone number to a consistent format with only digits and hyphens
        phone_number = re.sub(r"[^\d-]", "", phone_number)  # Remove spaces or other characters
        
        # Split the phone number into main part and last part
        parts = phone_number.rsplit('-', maxsplit=1)
        main_part, last_part = parts[0], parts[1] if len(parts) > 1 else ""
        
        if len(last_part) < 4:
            return f"Error: Last part of phone number must have at least 4 digits"
        
        # Extract the last 4 digits
        last_4_digits = [int(digit) for digit in last_part[-4:]]
        
        # Decipher the last 4 digits
        modified_digits = last_4_digits[1:]  # Get the first three digits
        modified_digits = [(digit - 4) % 10 for digit in modified_digits]  # Subtract 4 (mod 10)
        modified_digits.append(last_4_digits[0])  # Move the first digit back to the end
        
        # Replace the last 4 digits in the phone number
        new_last_part = last_part[:-4] + ''.join(map(str, modified_digits))
        return f"{main_part}-{new_last_part}"
    except Exception as e:
        return f"Error decipher phone number: {e}"


# Function to reverse Caesar shift
def reverse_shift_character(c, shift_amount):
    if c.isalpha():
        base = ord('A') if c.isupper() else ord('a')
        return chr((ord(c) - base - shift_amount) % 26 + base)
    return c

# Function to decipher the name
def decipher_name(ciphered_name, shift_amount=5):
    try:
        # Step 1: Reverse the Caesar shift
        decipher_with_shift = ''.join(reverse_shift_character(c, shift_amount) for c in ciphered_name)
        
        # Step 2: Remove the first two and last two characters before and after each character
        original_name = ''.join(decipher_with_shift[i + 2] for i in range(0, len(decipher_with_shift), 5))  # skip the random letters
        
        return original_name
    except Exception as e:
        return f"Error deciphering name: {e}"



# Decipher for IC (Identity Card Number)

def decipher_numeric(id_number):
    try:
        # Ensure the id_number is treated as a string
        id_number = str(id_number)

        def modify_four_digits(four_digits):
            # Extract first digit and put it last, modify first three digits by subtracting 5
            first_digit = four_digits[0]
            modified_digits = list(four_digits[1:])  # Start with the rest of the digits
            for i in range(3):
                new_digit = (int(modified_digits[i]) - 5) % 10
                modified_digits[i] = str(new_digit)
            return ''.join(modified_digits) + first_digit

        if len(id_number) < 8:
            # Only decipher the last 4 digits if the ID number is less than 6 characters
            last_4_digits = id_number[-4:]
            new_last_4 = modify_four_digits(list(last_4_digits))
            middle_digits = id_number[:-4]  # Everything before the last 4 digits
            deciphered_id = middle_digits + new_last_4
        else:
            # Split the ID number into sections
            first_4_digits = id_number[:4]
            middle_digits = id_number[4:-4]
            last_4_digits = id_number[-4:]

            # Modify the first and last 4 digits of the ID number
            new_first_4 = modify_four_digits(list(first_4_digits))
            new_last_4 = modify_four_digits(list(last_4_digits))

            # Combine the modified sections back together
            deciphered_id = new_first_4 + middle_digits + new_last_4

        return str(deciphered_id)  # Return as a string
    except Exception as e:
        return f"Error decipher id number: {e}"



# Decipher for Email
# Function to reverse the Caesar cipher shift (shifting by -6)
# Function to reverse Caesar shift
def reverse_shift_character_email(c, shift_amount):
    if c.isalpha():
        base = ord('a')  # Since we're using lowercase letters in the cipher
        return chr((ord(c) - base - shift_amount) % 26 + base)
    return c

# Function to decipher the email
def decipher_email(ciphered_email, shift_amount=6):
    try:
        # Step 1: Extract the part before the '@' in the email
        name_before_at = ciphered_email.split('@')[0]
        
        # Step 2: Remove 2 random letters before and after each character (i.e. every 5th character)
        deciphered_name = ""
        for i in range(2, len(name_before_at), 5):  # Start from index 2 to skip 2 random letters before the character
            # Step 3: Reverse the Caesar shift
            deciphered_name += reverse_shift_character_email(name_before_at[i], shift_amount)
        
        # Step 4: Rebuild the email with the deciphered name and the original domain
        return f"{deciphered_name}@{ciphered_email.split('@')[1]}"
    except Exception as e:
        return f"Error deciphering email: {e}"
    


# Decipher for Credit Card Number
def decipher_credit_card(cc_number):
    """ Decipher the credit card number by reversing the transformation applied to the last 4 digits. """
    try:
        # Convert scientific notation to a full integer if input is float-like
        if isinstance(cc_number, (float, int)):
            cc_number = f"{int(cc_number):d}"  # Convert to integer string

        # Ensure cc_number is a string
        cc_number = str(cc_number).replace(" ", "").replace("-", "")  # Remove spaces/dashes

        # Validate that cc_number contains only digits
        if not cc_number.isdigit():
            raise ValueError("Credit card number must contain only digits.")

        # Validate length of credit card number
        if len(cc_number) < 10:
            raise ValueError("Credit card number is too short to process.")

        # Extract parts
        first_part = cc_number[:-4]
        ciphered_last_4 = cc_number[-4:]

        # Convert the ciphered last 4 digits to integers
        ciphered_digits = [int(digit) for digit in ciphered_last_4]

        # The key digit used in ciphering is the first digit of the ciphered block
        key_digit = ciphered_digits[0]

        # Reverse the transformation to get the original last 4 digits
        original_digits = [
            (digit - key_digit + 10) % 10 for digit in ciphered_digits[1:]
        ]

        # Add back the key digit as the last digit
        original_last_4 = ''.join(map(str, original_digits)) + str(key_digit)

        # Reconstruct the full original credit card number
        return first_part + original_last_4

    except Exception as e:
        return f"Error deciphering credit card number: {e}"


##########################################################################################################
#Masking Rule 

def generate_fake_email():
    """Generate a fake email address."""
    return fake.email()

def mask_email(email):
    """Mask the email address."""
    local, domain = email.split("@")
    local_masked = local[0] + '*' * (len(local) - 2) + local[-1] if len(local) > 2 else '*' * len(local)
    return f"{local_masked}@{domain}"

def mask_credit_card(value):
    """Mask credit card numbers by keeping the last four digits."""
    if len(value) > 4:
        return '*' * (len(value) - 4) + value[-4:]
    return value

def generate_fake_health_status():
    """Generate a fake health status."""
    statuses = ["Healthy", "Under Observation", "Critical", "Recovering", "Needs Attention"]
    return random.choice(statuses)
###############SALARY######################
def generate_fake_salary():
    """Generate a fake salary within a range."""
    return random.randint(2000, 15000)  # Random salary between 2,000 and 15,000

def mask_salary_with_range(value):
    """Mask salary by generating a fake salary and then masking it within a reasonable range."""
    fake_salary = generate_fake_salary()  # Generate a fake salary
    min_salary = fake_salary - (fake_salary % 1000)  # Round down to the nearest 1000 (e.g., 5500 -> 5000)
    max_salary = min_salary + 999  # Mask within a range (e.g., 5000-5999)

    # Ensure salary is within valid range
    min_salary = max(2000, min_salary)  # Minimum salary should be at least 2000
    max_salary = min(15000, max_salary)  # Maximum salary should be at most 15,000

    return f"{min_salary}-{max_salary}"  # Return the salary range (e.g., "5000-6000")
###############RELIGION######################
def pseudonymize_religion(value):
    """Pseudonymize religion as Religion1, Religion2, etc."""
    global religion_counter

    # Normalize the religion value for consistency
    normalized_value = value.strip().lower() if isinstance(value, str) else str(value)

    # Check if the value already has a pseudonym
    if religion_pseudonym_mapping[normalized_value] is None:
        pseudonym = f"Religion{religion_counter}"
        religion_pseudonym_mapping[normalized_value] = pseudonym
        religion_counter += 1

    return religion_pseudonym_mapping[normalized_value]
###############RACE######################
def pseudonymize_race(value):
    """Pseudonymize race as Race1, Race2, etc."""
    global race_counter

    # Normalize the race value for consistency
    normalized_value = value.strip().lower() if isinstance(value, str) else str(value)

    # Check if the value already has a pseudonym
    if race_pseudonym_mapping[normalized_value] is None:
        pseudonym = f"Race{race_counter}"
        race_pseudonym_mapping[normalized_value] = pseudonym
        race_counter += 1

    return race_pseudonym_mapping[normalized_value]
###############GENDER######################
def pseudonymize_gender(value):
    """Pseudonymize gender as Gender1, Gender2, etc."""
    global gender_counter

    # Normalize the gender value for consistency
    normalized_value = value.strip().lower() if isinstance(value, str) else str(value)

    # Check if the value already has a pseudonym
    if gender_pseudonym_mapping[normalized_value] is None:
        pseudonym = f"Gender{gender_counter}"
        gender_pseudonym_mapping[normalized_value] = pseudonym
        gender_counter += 1

    return gender_pseudonym_mapping[normalized_value]
###############PLACE_OF_BIRTH######################
def generate_fake_place_of_birth():
    """Generate a fake state for place of birth."""
    states = ["Kuala Lumpur", "Sarawak", "Johor Darul Ta'zim", "Penang", "Sabah", "Selangor", "Perak", "Negeri Sembilan", "Kedah", "Kelantan", "Pahang", "Terengganu", "Perlis", "Malacca"]
    return random.choice(states)

def mask_place_of_birth(value):
    """Partially mask the place of birth."""
    fake_state = generate_fake_place_of_birth()
    
    return (fake_state)
###############PHONE######################
def generate_fake_phone_number():
    """Generate a fake phone number with a randomized area code in the format (XXX-XXXXXXX)."""
    # List of possible area codes (you can expand this list)
    area_codes = ['010', '011', '012', '013', '014', '015', '016', '017', '018', '019']
    
    # Randomly choose an area code
    area_code = random.choice(area_codes)
    
    # Generate a random 7-digit number
    number = ''.join(random.choices(string.digits, k=7))  # e.g., 3456789
    
    # Combine area code and number into the desired format
    return f"({area_code})-{number}"

def mask_phone(phone):
    """Mask the last four digits of the phone number."""
    # Ensure phone follows the pattern (012)-3456789
    match = re.match(r'\((\d{3})\)-(\d{7})', phone)
    if match:
        area_code = match.group(1)  # Extract the area code
        number = match.group(2)     # Extract the 7-digit number

        # Mask the last 4 digits with asterisks
        masked_number = number[:3] + '*' * 4

        # Combine area code and masked number into the desired format
        return f"({area_code})-{masked_number}"
    
    # Return phone unchanged if it doesn't match the pattern
    return phone
###############IC######################
def mask_numeric(value=None):
    """Generate and partially mask a fake IC number."""
    fake_ic = generate_fake_ic_number()
    # Mask the last 5 numbers
    masked_ic = fake_ic[:-5] + '*' * 5
    return masked_ic

def generate_fake_ic_number():
    """Generate a fake IC number in the format YYMMDD-XX-XXXX."""
    random_date = fake.date_of_birth(minimum_age=18, maximum_age=100)
    date_part = random_date.strftime("%y%m%d")
    state_code = f"{random.randint(1, 14):02d}"
    unique_identifier = f"{random.randint(0, 9999):04d}"
    return f"{date_part}-{state_code}-{unique_identifier}"

###############SALARY######################
def randomize_salary(value):
    """ Randomize salary data. """
    if isinstance(value, (int, float)):
        return random.randint(2000, 10000)  # Random salary between RM2000 and RM10000
    return value

###############ADDRESS######################
def anonymize_name_or_address(value, column_name=None):
    """Generate a fake name or address and anonymize it."""
    if column_name:
        if 'name' in column_name.lower() or 'nama' in column_name.lower():
            # Generate and return a fake name
            return fake.name()
        elif 'address' in column_name.lower() or 'alamat' in column_name.lower():
            # Generate and return a fake address
            return fake.address()
        # Further anonymization logic for other types can follow
    # If no anonymization is required, return the original value
    return value
def mask_address(address):
    """Partially mask the home address."""
    if address:
        address_parts = address.split("\n")
        masked_address = []
        for part in address_parts:
            if re.search(r'\d+', part):  # Likely a street number
                masked_part = re.sub(r'\d+', '*', part)  # Mask street numbers
            else:
                masked_part = re.sub(r'\w+', '*', part)  # Mask each word with asterisks
            masked_address.append(masked_part)
        return "\n".join(masked_address)
    return address
###############DATE######################
def mask_date(value):
    """ Mask date data by replacing it with a random date. """
    if isinstance(value, str):
        # Check if the value is in the ciphered format (d.m.yyyy)
        if len(value.split('.')) == 3:  # It's a date in d.m.yyyy format
            try:
                value = datetime.strptime(value, "%d.%m.%Y")  # Parse the date in the ciphered format
            except ValueError:
                return value  # Return the original value if the format doesn't match
        else:
            try:
                value = datetime.strptime(value, "%d/%m/%Y")  # Try the regular format (dd/mm/yyyy)
            except ValueError:
                try:
                    value = datetime.strptime(value, "%Y-%m-%d")  # Try another common format (yyyy-mm-dd)
                except ValueError:
                    return value  # Return the original value if no formats match

    if isinstance(value, datetime):
        return fake.date_of_birth(minimum_age=18, maximum_age=100).strftime("%d/%m/%Y")
    return value
###############AGE######################
def anonymize_age(value):
    """ Anonymize age by generating a random age between 18 and 100. """
    if isinstance(value, int):
        return random.randint(18, 100)  # Randomize age between 18 and 100
    return value

def generate_fake_age():
    """Generate a fake age between 18 and 100."""
    return random.randint(18, 100)

def mask_age_with_range(value):
    """ Mask age by generating a fake age and then masking it within a reasonable range. """
    fake_age = generate_fake_age()  # Generate a fake age
    min_age = fake_age - (fake_age % 10)  # Round down to the nearest decade (e.g., 37 -> 30)
    max_age = min_age + 9  # Mask within a range (e.g., 30-39)

    # Ensure the age is in a valid range
    min_age = max(18, min_age)  # Minimum age should be at least 18
    max_age = min(100, max_age)  # Maximum age should be at most 100

    return f"{min_age}-{max_age}"  # Return the age range (e.g., "30-40")

##########################################################################################################
# Main function to process data based on the column name
def cipher_data(value, column_name=None):
    """ Mask data based on the type of value and column name. """
    if column_name:
        column_name = preprocess_column_name(column_name)

        
        # Fuzzy matching to detect Birth Date-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in BIRTH_DATE_KEYWORDS):
            return cipher_date(value)
        
        # Fuzzy matching to detect phone number-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in PHONE_KEYWORDS):
            return cipher_phone_number(value)
        
        # Fuzzy matching to detect name-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in NAME_KEYWORDS):
            return cipher_name(value)
        
        # Fuzzy matching to detect IC-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in IC_KEYWORDS):
            return cipher_numeric(value)
         
        # Fuzzy matching to detect email-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in EMAIL_KEYWORDS):
            return cipher_email(value)
        
        # Preprocess the value for credit card columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in CREDIT_CARD_KEYWORDS):
            value = preprocess_credit_card_number(value)  # Preprocess CC number
            return cipher_credit_card(value)
        
        
        
    return value  # Return original value if no match

def decipher_data(value, column_name=None):
    """ Mask data based on the type of value and column name. """
    if column_name:
        column_name = preprocess_column_name(column_name)

        # Fuzzy matching to detect Birth Date-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in BIRTH_DATE_KEYWORDS):
            return decipher_date(value)
        
        # Fuzzy matching to detect phone number-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in PHONE_KEYWORDS):
            return decipher_phone_number(value)
        
        # Fuzzy matching to detect name-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in NAME_KEYWORDS):
            return decipher_name(value)
        
        
        # Fuzzy matching to detect IC-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in IC_KEYWORDS):
            return decipher_numeric(value)
        
        # Fuzzy matching to detect email-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in EMAIL_KEYWORDS):
            return decipher_email(value)
        
        # Fuzzy matching to detect credit card-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in CREDIT_CARD_KEYWORDS):
            return decipher_credit_card(value)

    return value  # Return original value if no match

def mask_data(value, column_name=None, columns_to_mask=None):
    """ Mask data based on the type of value and column name. """
    # If the column is not in columns_to_mask, return the original value
    if columns_to_mask and column_name not in columns_to_mask:
        return value  # No masking applied, return the original value

    # Apply masking for columns that are in columns_to_mask
    if columns_to_mask and column_name in columns_to_mask:
        column_name = preprocess_column_name(column_name)

        # Fuzzy matching to detect race-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in RACE_KEYWORDS):
            return pseudonymize_race(value)
        
        # Fuzzy matching to detect salary-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in SALARY_KEYWORDS):
            return mask_salary_with_range(value)  # Apply the salary masking

        # Fuzzy matching to detect religion-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in RELIGION_KEYWORDS):
            return pseudonymize_religion(value)

        # Fuzzy matching for Health Status-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in HEALTH_STATUS_KEYWORDS):
            return generate_fake_health_status()

        # Fuzzy matching for gender-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in GENDER_KEYWORDS):
            return pseudonymize_gender(value)

        # Fuzzy matching to detect Birth Date-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in BIRTH_DATE_KEYWORDS):
            return mask_date(value)

        # Fuzzy matching to detect Place of Birth-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in PLACE_OF_BIRTH_KEYWORDS):
            return mask_place_of_birth(value)

        # Fuzzy matching to detect phone number-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in PHONE_KEYWORDS):
            fake_phone = generate_fake_phone_number()  # Generate a fake phone number
            return mask_phone(fake_phone)  # Mask the generated phone number
        
        # Fuzzy matching to detect name-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in NAME_KEYWORDS):
            return anonymize_name_or_address(value, column_name)  # Mask the generated name
        
        # Fuzzy matching to detect IC-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in IC_KEYWORDS):
            return mask_numeric(value)  # Apply the fake IC masking
        
        # Fuzzy matching to detect email-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in EMAIL_KEYWORDS):
            fake_email = generate_fake_email()
            return mask_email(fake_email)  # Mask the generated email

        # Fuzzy matching to detect address-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in ADDRESS_KEYWORDS):
            fake_address = fake.address()
            return mask_address(fake_address)  # Mask the generated address

        # Fuzzy matching to detect age-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in AGE_KEYWORDS):
            return mask_age_with_range(value)  # Apply the age masking
        
        # Fuzzy matching to detect credit card-related columns
        if any(fuzz.partial_ratio(column_name, keyword) > 80 for keyword in CREDIT_CARD_KEYWORDS):
            return mask_credit_card(value)

    # Fallback for unmatched columns
    if isinstance(value, str):
        return 'XXXXXX'  # Mask the string data
    elif isinstance(value, (int, float)):
        return '*****'  # Mask the numeric data
    elif isinstance(value, datetime):
        return mask_date(value)  # Mask date data
    return fake.text(max_nb_chars=20)  # Generate a fake text for unknown types

# Preserve textual values, including leading zeros and literal NA values.
# XLSX numeric cells already rounded by Excel cannot be restored.
def read_upload():
    file = request.files.get("file")
    if not file or not file.filename.lower().endswith((".csv", ".xlsx")):
        raise ValueError("Upload a CSV or XLSX file.")
    content = file.read()
    if len(content) > 10 * 1024 * 1024:
        raise ValueError("File exceeds the 10 MiB limit.")
    if file.filename.lower().endswith(".csv"):
        frame = pd.read_csv(StringIO(content.decode("utf-8-sig")), dtype=str, keep_default_na=False)
    else:
        with zipfile.ZipFile(BytesIO(content)) as archive:
            if sum(item.file_size for item in archive.infolist()) > 50 * 1024 * 1024:
                raise ValueError("Expanded spreadsheet exceeds the limit.")
        frame = pd.read_excel(BytesIO(content), dtype=str, keep_default_na=False)
    if len(frame) > 100000 or len(frame.columns) > 200:
        raise ValueError("Limit is 100,000 rows and 200 columns.")
    return frame

def output_csv(frame, transform=None):
    output = StringIO()
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow(frame.columns)
    for row in frame.itertuples(index=False, name=None):
        writer.writerow([transform(str(value), column) if transform else value
                         for column, value in zip(frame.columns, row)])
    content = output.getvalue()
    if len(content.encode("utf-8")) > 10 * 1024 * 1024:
        raise ValueError("Processed content exceeds the 10 MiB limit.")
    return content

@main_app.post("/detect_columns")
def detect_columns():
    try:
        return jsonify({"columns": read_upload().columns.tolist()})
    except Exception:
        return jsonify({"error": "Invalid or oversized CSV/XLSX file."}), 400

@main_app.post("/process_file")
def process_file():
    try:
        return Response(output_csv(read_upload()), mimetype="text/csv")
    except Exception:
        return jsonify({"error": "Invalid or oversized CSV/XLSX file."}), 400

@main_app.post("/apply_masking_rules")
def apply_masking_rules():
    try:
        data = request.get_json()
        content, columns = data.get("content"), data.get("columnsToMask")
        if not isinstance(content, str) or not isinstance(columns, list) or not columns:
            raise ValueError()
        frame = pd.read_csv(StringIO(content), dtype=str, keep_default_na=False)
        if any(not isinstance(c, str) or c not in frame.columns for c in columns):
            raise ValueError()
        # Scope pseudonym maps to one file, never across unrelated accounts.
        global race_counter, religion_counter, gender_counter
        race_pseudonym_mapping.clear()
        religion_pseudonym_mapping.clear()
        gender_pseudonym_mapping.clear()
        race_counter = religion_counter = gender_counter = 1
        legacy = data.get("contentFormat", "legacy-cipher") == "legacy-cipher"
        def transform(value, column):
            if column in columns:
                return mask_data(value, column, columns)
            return decipher_data(value, column) if legacy else value
        return jsonify({"maskedContent": output_csv(frame, transform)})
    except Exception:
        return jsonify({"error": "Invalid content or masking selection."}), 400

@main_app.post("/deProcessFile")
def de_process_file():
    # Compatibility for files uploaded before raw_csv format was introduced.
    try:
        return Response(output_csv(read_upload(), decipher_data), mimetype="text/csv")
    except Exception:
        return jsonify({"error": "Unable to recover legacy file."}), 400

if __name__ == "__main__":
    main_app.run(host="127.0.0.1", port=int(os.environ.get("PROCESSOR_PORT", 5000)), debug=False, threaded=False)
