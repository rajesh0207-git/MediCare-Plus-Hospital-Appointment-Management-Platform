import os
from fpdf import FPDF
from datetime import datetime

class PDF(FPDF):
    def header(self):
        # Draw hospital header design
        self.set_fill_color(30, 144, 255)  # Dodger Blue
        self.rect(0, 0, 210, 35, "F")
        self.set_text_color(255, 255, 255)
        self.set_font("helvetica", "B", 20)
        self.cell(0, 10, "MEDICARE PLUS HOSPITAL", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("helvetica", "I", 10)
        self.cell(0, 5, "Your Trusted Partner in Health & Care", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(10)

    def footer(self):
        # Draw footer design
        self.set_y(-25)
        self.set_fill_color(245, 245, 245)
        self.rect(0, 297 - 25, 210, 25, "F")
        self.set_y(-20)
        self.set_text_color(100, 100, 100)
        self.set_font("helvetica", "I", 8)
        self.cell(0, 5, "This is a computer-generated document. No signature required.", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 5, f"Page {self.page_no()}/{{nb}} - Support: support@medicareplus.com", align="C")

class PDFService:
    @staticmethod
    def _ensure_dir(directory: str):
        if not os.path.exists(directory):
            os.makedirs(directory)

    @classmethod
    def generate_prescription_pdf(
        cls, prescription_id: int, date_str: str, doc_name: str, specialization: str, pat_name: str, pat_age: int, pat_gender: str, medications: list, instructions: str
    ) -> str:
        pdf_dir = os.path.join("static", "prescriptions")
        cls._ensure_dir(pdf_dir)
        filename = f"prescription_{prescription_id}.pdf"
        file_path = os.path.join(pdf_dir, filename)

        pdf = PDF()
        pdf.set_auto_page_break(auto=True, margin=30)
        pdf.add_page()
        pdf.set_font("helvetica", "", 11)
        pdf.set_text_color(50, 50, 50)

        # Doctor Details (Right-aligned)
        pdf.set_y(40)
        pdf.set_font("helvetica", "B", 12)
        pdf.cell(0, 5, f"Dr. {doc_name}", align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "I", 10)
        pdf.cell(0, 5, f"Specialization: {specialization}", align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 5, f"Date: {date_str}", align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)

        # Patient Details
        pdf.set_fill_color(240, 248, 255)  # Light blue background
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(0, 7, "PATIENT INFORMATION", fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 10)
        pdf.cell(100, 6, f"Name: {pat_name}")
        pdf.cell(50, 6, f"Age: {pat_age}")
        pdf.cell(40, 6, f"Gender: {pat_gender}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

        # Rx symbol
        pdf.set_font("helvetica", "B", 24)
        pdf.set_text_color(30, 144, 255)
        pdf.cell(0, 10, "Rx", new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(50, 50, 50)
        pdf.ln(2)

        # Table header for medications
        pdf.set_font("helvetica", "B", 10)
        pdf.set_fill_color(230, 230, 230)
        pdf.cell(60, 8, "Medication Name", border=1, fill=True)
        pdf.cell(30, 8, "Dosage", border=1, fill=True)
        pdf.cell(40, 8, "Frequency", border=1, fill=True)
        pdf.cell(30, 8, "Duration", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

        # Table rows
        pdf.set_font("helvetica", "", 9)
        for med in medications:
            pdf.cell(60, 8, str(med.get("name", "")), border=1)
            pdf.cell(30, 8, str(med.get("dosage", "")), border=1)
            pdf.cell(40, 8, str(med.get("frequency", "")), border=1)
            pdf.cell(30, 8, str(med.get("duration", "")), border=1, new_x="LMARGIN", new_y="NEXT")

        pdf.ln(10)

        # General Instructions
        if instructions:
            pdf.set_font("helvetica", "B", 11)
            pdf.cell(0, 7, "INSTRUCTIONS / NOTES", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("helvetica", "I", 10)
            pdf.multi_cell(0, 5, instructions)
            pdf.ln(10)

        pdf.output(file_path)
        return file_path

    @classmethod
    def generate_invoice_pdf(
        cls, bill_id: int, date_str: str, pat_name: str, pat_phone: str, amount: float, tax: float, discount: float, total: float, status: str
    ) -> str:
        pdf_dir = os.path.join("static", "billing")
        cls._ensure_dir(pdf_dir)
        filename = f"bill_{bill_id}.pdf"
        file_path = os.path.join(pdf_dir, filename)

        pdf = PDF()
        pdf.set_auto_page_break(auto=True, margin=30)
        pdf.add_page()
        pdf.set_font("helvetica", "", 11)
        pdf.set_text_color(50, 50, 50)

        # Invoice Header Details
        pdf.set_y(40)
        pdf.set_font("helvetica", "B", 14)
        pdf.cell(0, 7, f"INVOICE #INV-{bill_id:05d}", align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 10)
        pdf.cell(0, 5, f"Date: {date_str}", align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 5, f"Payment Status: {status.upper()}", align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)

        # Bill To
        pdf.set_fill_color(240, 248, 255)
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(0, 7, "BILL TO:", fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 10)
        pdf.cell(0, 6, f"Patient Name: {pat_name}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, f"Phone: {pat_phone}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)

        # Fee Details Table
        pdf.set_font("helvetica", "B", 10)
        pdf.set_fill_color(230, 230, 230)
        pdf.cell(120, 8, "Description", border=1, fill=True)
        pdf.cell(60, 8, "Amount ($)", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("helvetica", "", 10)
        pdf.cell(120, 8, "Medical Consultation & Care Services", border=1)
        pdf.cell(60, 8, f"{amount:.2f}", border=1, new_x="LMARGIN", new_y="NEXT")

        pdf.ln(5)

        # Summary calculations
        pdf.set_font("helvetica", "", 10)
        pdf.cell(120, 6, "Subtotal", align="R")
        pdf.cell(60, 6, f"${amount:.2f}", align="R", new_x="LMARGIN", new_y="NEXT")
        
        pdf.cell(120, 6, "Tax (GST/VAT)", align="R")
        pdf.cell(60, 6, f"${tax:.2f}", align="R", new_x="LMARGIN", new_y="NEXT")

        pdf.cell(120, 6, "Discount", align="R")
        pdf.cell(60, 6, f"-${discount:.2f}", align="R", new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("helvetica", "B", 12)
        pdf.set_text_color(30, 144, 255)
        pdf.cell(120, 8, "Total Amount Due", align="R")
        pdf.cell(60, 8, f"${total:.2f}", align="R", new_x="LMARGIN", new_y="NEXT")

        pdf.output(file_path)
        return file_path

    @classmethod
    def generate_discharge_report(
        cls, admission_id: int, date_str: str, patient_name: str, patient_age, patient_gender: str, patient_phone: str,
        admission_type: str, diagnosis: str, admission_date: str, discharge_date: str,
        bed_number: str, ward_name: str, discharge_status: str, discharge_summary: str,
        discharge_medication: str, followup_instructions: str, followup_date: str, discharged_by: str
    ) -> str:
        pdf_dir = os.path.join("static", "discharge_reports")
        cls._ensure_dir(pdf_dir)
        filename = f"discharge_{admission_id}.pdf"
        file_path = os.path.join(pdf_dir, filename)

        pdf = PDF()
        pdf.set_auto_page_break(auto=True, margin=30)
        pdf.add_page()
        pdf.set_font("helvetica", "", 11)
        pdf.set_text_color(50, 50, 50)

        # Report Header
        pdf.set_y(40)
        pdf.set_font("helvetica", "B", 14)
        pdf.cell(0, 7, "DISCHARGE SUMMARY REPORT", align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 10)
        pdf.cell(0, 5, f"Date: {date_str}", align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 5, f"Report ID: DIS-{admission_id:05d}", align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)

        # Patient Information
        pdf.set_fill_color(240, 248, 255)
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(0, 7, "PATIENT INFORMATION", fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 10)
        pdf.cell(95, 6, f"Name: {patient_name}")
        pdf.cell(45, 6, f"Age: {patient_age if patient_age else 'N/A'}")
        pdf.cell(40, 6, f"Gender: {patient_gender}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(95, 6, f"Phone: {patient_phone}")
        pdf.cell(45, 6, f"Admission Type: {admission_type}")
        pdf.cell(40, 6, "", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

        # Admission Details
        pdf.set_fill_color(255, 250, 240)  # Light orange
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(0, 7, "ADMISSION DETAILS", fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 10)
        pdf.cell(95, 6, f"Admission Date: {admission_date}")
        pdf.cell(85, 6, f"Discharge Date: {discharge_date}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(95, 6, f"Bed: {bed_number}")
        pdf.cell(85, 6, f"Ward: {ward_name}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, f"Diagnosis: {diagnosis}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

        # Discharge Summary
        pdf.set_fill_color(240, 255, 240)  # Light green
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(0, 7, "DISCHARGE SUMMARY", fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 10)
        pdf.cell(0, 6, f"Status: {discharge_status}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)
        pdf.multi_cell(0, 5, f"Summary: {discharge_summary}")
        pdf.ln(5)

        # Medications on Discharge
        pdf.set_fill_color(240, 248, 255)
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(0, 7, "DISCHARGE MEDICATIONS", fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 10)
        pdf.multi_cell(0, 5, discharge_medication)
        pdf.ln(5)

        # Follow-up Instructions
        pdf.set_fill_color(255, 240, 245)  # Light pink
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(0, 7, "FOLLOW-UP INSTRUCTIONS", fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 10)
        pdf.multi_cell(0, 5, followup_instructions)
        pdf.ln(3)
        pdf.cell(0, 6, f"Next Follow-up Date: {followup_date}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

        # Authorized By
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(0, 6, f"Discharged By: {discharged_by}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, "Authorized Signature: ___________________", new_x="LMARGIN", new_y="NEXT")

        pdf.output(file_path)
        return file_path
