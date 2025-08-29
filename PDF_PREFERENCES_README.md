# PDF Preference Extraction Feature

This feature allows doctors to automatically extract their vacancy preferences from PDF documents and set them as their preferences in the system, rather than manually entering them one by one.

## Features

- **PDF Upload**: Drag and drop or click to upload PDF files
- **Automatic Extraction**: Extracts preferences from page 7 onwards of the PDF
- **Smart Mapping**: Automatically maps extracted preferences to available vacancies
- **Manual Review**: Doctors can review and adjust the mapping before confirming
- **Bulk Save**: Confirms all preferences at once instead of individual entry

## How It Works

### 1. PDF Upload
- Navigate to "PDF Preferences" in the navigation menu
- Upload a PDF file containing doctor preferences
- The system accepts only PDF files

### 2. Preference Extraction
- The API processes the PDF starting from page 7
- Uses iTextSharp library to extract text content
- Parses the text to identify vacancy preferences
- Returns structured preference data

### 3. Preference Mapping
- Extracted preferences are automatically mapped to available vacancies
- Uses fuzzy matching based on station, department, and specialty names
- Doctors can manually adjust the mapping using dropdown selectors

### 4. Confirmation
- Review all mapped preferences
- Confirm to save preferences to the database
- Existing preferences are replaced with the new set

## API Endpoints

### Extract Preferences
```
POST /api/PdfPreferences/extract-preferences
Content-Type: multipart/form-data
Body: pdfFile (PDF file)
```

### Confirm Preferences
```
POST /api/PdfPreferences/confirm-preferences
Content-Type: application/json
Body: {
  "doctorId": number,
  "preferences": number[]
}
```

## Technical Implementation

### Backend (C# .NET 8)
- **Controller**: `PdfPreferencesController`
- **PDF Processing**: iTextSharp library
- **Text Extraction**: Page-by-page text extraction from page 7 onwards
- **Preference Parsing**: Custom logic to identify and structure preference data

### Frontend (Angular 17)
- **Component**: `PdfPreferencesComponent`
- **File Upload**: Drag-and-drop interface with file validation
- **Preference Display**: Grid layout showing extracted and mapped preferences
- **Responsive Design**: Mobile-friendly interface

## Dependencies

### Backend
- `iTextSharp` (5.5.13.3) - PDF text extraction
- `System.Text.Encoding.CodePages` (8.0.0) - Text encoding support

### Frontend
- Angular 17 with standalone components
- Reactive forms for preference mapping
- HTTP client for API communication

## Usage Instructions

1. **Access the Feature**
   - Login as a doctor
   - Click "PDF Preferences" in the navigation menu

2. **Upload PDF**
   - Click the upload area or drag a PDF file
   - Ensure the PDF contains preference information from page 7 onwards

3. **Review Extracted Data**
   - System will display extracted preferences
   - Review the automatic mapping to vacancies

4. **Adjust Mapping** (if needed)
   - Use dropdown selectors to change vacancy mappings
   - Ensure all preferences are properly mapped

5. **Confirm Preferences**
   - Click "Confirm Preferences" to save
   - System will replace existing preferences with the new set

## Notes

- The PDF parser is designed to work with the specific format of your preference documents
- You may need to adjust the parsing logic in `ParseVacancyLine()` method based on your actual PDF structure
- The feature automatically handles text encoding issues common in PDF documents
- All operations are logged for debugging and audit purposes

## Future Enhancements

- **OCR Support**: Add support for scanned PDFs
- **Template Recognition**: Automatic detection of different PDF formats
- **Batch Processing**: Process multiple PDFs at once
- **Preference Validation**: Additional validation rules for preference data
- **Export Functionality**: Export extracted preferences to various formats

