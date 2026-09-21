import os
from fpdf import FPDF

class PDFReport(FPDF):
    def header(self):
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(190, 10, 'RUET CSE 3206 - Software Engineering Sessional | Lab 2 Design Report', align='R')
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(190, 10, f'Page {self.page_no()}/{{nb}}', align='C')

def sanitize(text):
    return text.encode('latin-1', 'replace').decode('latin-1')

def generate_pdf():
    md_file = os.path.join('docs', 'Requirement_Report.md')
    pdf_file = os.path.join('docs', 'Requirement_Report.pdf')

    if not os.path.exists(md_file):
        print(f"Error: {md_file} not found.")
        return

    with open(md_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    pdf = PDFReport()
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    for line in lines:
        text = line.strip()
        
        if not text:
            pdf.ln(2)
            continue

        clean_text = sanitize(text.replace('**', '').replace('`', '').replace('#', '').strip())
        if not clean_text:
            continue
            
        # Heading 1
        if line.startswith('# '):
            pdf.ln(3)
            pdf.set_font('helvetica', 'B', 15)
            pdf.set_text_color(15, 23, 42)
            pdf.multi_cell(190, 7, clean_text)
            pdf.ln(1)
        # Heading 2
        elif line.startswith('## '):
            pdf.ln(2)
            pdf.set_font('helvetica', 'B', 12)
            pdf.set_text_color(2, 132, 199)
            pdf.multi_cell(190, 6, clean_text)
            pdf.ln(1)
        # Heading 3
        elif line.startswith('### '):
            pdf.set_font('helvetica', 'B', 10)
            pdf.set_text_color(30, 41, 59)
            pdf.multi_cell(190, 5, clean_text)
        # Bullet items
        elif line.startswith('* ') or line.startswith('- '):
            pdf.set_font('helvetica', '', 9)
            pdf.set_text_color(51, 65, 85)
            pdf.multi_cell(190, 5, f"  - {clean_text[2:] if clean_text.startswith('* ') or clean_text.startswith('- ') else clean_text}")
        # Table rows or text
        else:
            pdf.set_font('helvetica', '', 9)
            pdf.set_text_color(51, 65, 85)
            pdf.multi_cell(190, 5, clean_text)

    pdf.output(pdf_file)
    print(f"Successfully generated {pdf_file}")

if __name__ == '__main__':
    generate_pdf()
