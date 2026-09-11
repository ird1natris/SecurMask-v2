# SecurMask: Fortifying Data Privacy With Intelligent Masking

**SecurMask** is a web application designed to securely mask sensitive data and unmask masked data in .csv and .xlsx files. With a sleek React frontend and a dual backend powered by both Node.js and Flask, the app ensures a seamless and secure data masking and unmasking experience.

## Features

- **Data Masking**: Encrypt sensitive data in specified columns of CSV or XLSX files.
- **Data Unmasking**: Decrypt previously masked data to its original state.
- **Secure Encryption**: Utilizes the `cryptography` library for robust data encryption.
- Upload .csv and .xlsx files for secure processing.
- Mask sensitive data such as birthdates, addresses, emails, credit card details, and more.
- Customizable masking options: select specific columns or apply masking to all columns.
- Fast and secure processing with Python’s Pandas and Node.js libraries.
- Responsive and user-friendly UI.
- Download the masked file securely.

## Technologies Used

**Frontend**

- **React.js**: Dynamic user interface.
- **SweetAlert2**: Elegant alert modals for user interactions.
- **CSS**: Custom styling and animations.
  
**Backend**

- **Node.js**: For file handling, routing, and integration with React.
- **Express.js**: API routing and server setup.
- **Flask**: Python-based backend for advanced data masking and processing.
- **Pandas**: Efficient data handling and transformation.
- **Python Faker**: Generating fake data for sensitive fields.

## Getting Started

### Prerequisites

Ensure the following tools are installed:

- **Node.js 14.x or later** (for the frontend and Node.js backend)
- **Python 3.8 or later** (for the Flask backend)
- **pip** (Python package manager)
- **npm**

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/ird1natris/SecurMask-v1.git
   cd SecurMask-v1
   ```
2. **Set Up the Backend**
   
   Navigate to the `backend` folder:
   ```bash
   cd server
   ```
   
   Run the Flask backend:
   ```bash
   npm start  
   ```

3. **Set Up the Frontend**

   Install the dependencies:
   ```bash
   npm install  
   ```

   Start the React client server:
   ```bash
   npm run dev    
   ```

## Future Enhancements

- Expand support for other file formats (e.g., .json, .xml).
- Incorporate machine learning for intelligent data masking patterns.
