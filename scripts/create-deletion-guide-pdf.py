#!/usr/bin/env python3
"""
Script to convert deletion request guide markdown to PDF
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import re

# Try to use Vietnamese font if available, otherwise fall back to default
try:
    # Common Vietnamese fonts on Windows
    pdfmetrics.registerFont(TTFont('Arial', 'arial.ttf'))
    pdfmetrics.registerFont(TTFont('Times', 'times.ttf'))
    VIETNAMESE_FONT = 'Arial'
except:
    VIETNAMESE_FONT = 'Helvetica'

def clean_text(text):
    """Remove markdown formatting and clean text"""
    # Remove markdown headers
    text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
    # Remove markdown bold/italic
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    # Remove markdown links but keep text
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    # Remove markdown code blocks
    text = re.sub(r'```[^`]*```', '', text, flags=re.DOTALL)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    # Remove markdown tables formatting
    text = re.sub(r'\|', ' ', text)
    text = re.sub(r'-{3,}', '', text)
    return text.strip()

def parse_markdown_to_elements(md_content):
    """Parse markdown content and return list of elements"""
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=12,
        fontName=VIETNAMESE_FONT,
        alignment=TA_CENTER
    )
    
    heading1_style = ParagraphStyle(
        'CustomHeading1',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=12,
        spaceBefore=18,
        fontName=VIETNAMESE_FONT,
        keepWithNext=1
    )
    
    heading2_style = ParagraphStyle(
        'CustomHeading2',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#34495e'),
        spaceAfter=8,
        spaceBefore=12,
        fontName=VIETNAMESE_FONT,
        keepWithNext=1
    )
    
    heading3_style = ParagraphStyle(
        'CustomHeading3',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=colors.HexColor('#34495e'),
        spaceAfter=6,
        spaceBefore=8,
        fontName=VIETNAMESE_FONT,
        keepWithNext=1
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#333333'),
        spaceAfter=6,
        fontName=VIETNAMESE_FONT,
        alignment=TA_JUSTIFY,
        leading=14
    )
    
    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#333333'),
        spaceAfter=4,
        leftIndent=20,
        fontName=VIETNAMESE_FONT,
        leading=14
    )
    
    code_style = ParagraphStyle(
        'CustomCode',
        parent=styles['Code'],
        fontSize=10,
        textColor=colors.HexColor('#c7254e'),
        backColor=colors.HexColor('#f5f5f5'),
        fontName='Courier',
        leftIndent=10,
        rightIndent=10
    )
    
    lines = md_content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        if not line:
            elements.append(Spacer(1, 6))
            i += 1
            continue
        
        # Title (first # heading)
        if line.startswith('# ') and i == 0:
            text = clean_text(line[2:])
            elements.append(Paragraph(text, title_style))
            elements.append(Spacer(1, 12))
        
        # Heading 1
        elif line.startswith('# '):
            text = clean_text(line[2:])
            elements.append(Paragraph(text, heading1_style))
        
        # Heading 2
        elif line.startswith('## '):
            text = clean_text(line[3:])
            elements.append(Paragraph(text, heading2_style))
        
        # Heading 3
        elif line.startswith('### '):
            text = clean_text(line[4:])
            elements.append(Paragraph(text, heading3_style))
        
        # Bullet points
        elif line.startswith('- ') or line.startswith('* '):
            text = clean_text(line[2:])
            # Handle nested bullets
            if line.startswith('  - ') or line.startswith('  * '):
                text = clean_text(line[4:])
                bullet_style.leftIndent = 30
            else:
                bullet_style.leftIndent = 20
            elements.append(Paragraph(f"• {text}", bullet_style))
        
        # Numbered list
        elif re.match(r'^\d+\.\s+', line):
            text = clean_text(re.sub(r'^\d+\.\s+', '', line))
            elements.append(Paragraph(f"• {text}", bullet_style))
        
        # Table (simple detection)
        elif '|' in line and i < len(lines) - 1:
            # Collect table rows
            table_rows = []
            while i < len(lines) and '|' in lines[i]:
                row = [cell.strip() for cell in lines[i].split('|') if cell.strip()]
                if row and not all(c == '-' for c in ''.join(row)):  # Skip separator rows
                    table_rows.append(row)
                i += 1
            i -= 1  # Adjust for loop increment
            
            if table_rows:
                # Create table
                table = Table(table_rows)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495e')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), VIETNAMESE_FONT),
                    ('FONTSIZE', (0, 0), (-1, 0), 11),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                    ('FONTNAME', (0, 1), (-1, -1), VIETNAMESE_FONT),
                    ('FONTSIZE', (0, 1), (-1, -1), 10),
                ]))
                elements.append(table)
                elements.append(Spacer(1, 12))
        
        # Code blocks
        elif line.startswith('```'):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            if code_lines:
                code_text = '\n'.join(code_lines)
                elements.append(Paragraph(code_text, code_style))
                elements.append(Spacer(1, 6))
        
        # Regular paragraph
        else:
            text = clean_text(line)
            if text:
                # Check for special formatting
                if text.startswith('**') and text.endswith('**'):
                    text = text[2:-2]
                    para_style = ParagraphStyle(
                        'Bold',
                        parent=normal_style,
                        fontName=VIETNAMESE_FONT,
                        fontSize=11
                    )
                    elements.append(Paragraph(text, para_style))
                else:
                    elements.append(Paragraph(text, normal_style))
        
        i += 1
    
    return elements

def create_pdf(md_file, pdf_file):
    """Create PDF from markdown file"""
    # Read markdown file
    with open(md_file, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # Create PDF
    doc = SimpleDocTemplate(
        pdf_file,
        pagesize=A4,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )
    
    # Parse markdown to elements
    elements = parse_markdown_to_elements(md_content)
    
    # Build PDF
    doc.build(elements)
    print(f"PDF created successfully: {pdf_file}")

if __name__ == '__main__':
    import sys
    import os
    
    md_file = r'd:\documentsManager\docs\huong-dan-xoa-tai-lieu.md'
    pdf_file = r'd:\documentsManager\docs\huong-dan-xoa-tai-lieu.pdf'
    
    if not os.path.exists(md_file):
        print(f"Error: Markdown file not found: {md_file}")
        sys.exit(1)
    
    create_pdf(md_file, pdf_file)
