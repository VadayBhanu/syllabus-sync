"""Builds the demo syllabus PDF in public/samples. Run: python3 scripts/make-sample-pdf.py"""
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

out = "public/samples/hist1311-syllabus.pdf"
doc = SimpleDocTemplate(out, pagesize=letter, title="HIST 1311 Syllabus")
ss = getSampleStyleSheet()
story = [
    Paragraph("HIST 1311 - History of the United States to 1865", ss["Title"]),
    Paragraph("University of Texas at Arlington &middot; Fall 2026 &middot; TR 11:00 AM - 12:20 PM, UH 108", ss["Normal"]),
    Spacer(1, 12),
    Paragraph("Grading", ss["Heading2"]),
    Paragraph("Map quizzes 10%, Response papers 30%, Midterm 25%, Final exam 35%. Late papers lose 1/2 a letter grade per day.", ss["Normal"]),
    Spacer(1, 12),
    Paragraph("Schedule", ss["Heading2"]),
]
rows = [
    ["Week", "Date", "Topic / What's due"],
    ["1", "Aug 25", "Course overview"],
    ["2", "Sep 1", "Map Quiz 1"],
    ["3", "Sep 10", "Response Paper 1 due, 11:59 PM"],
    ["5", "Sep 22", "Map Quiz 2"],
    ["6", "Oct 1", "Response Paper 2 due"],
    ["8", "Oct 13", "Midterm Exam (25%)"],
    ["9", "Oct 20", "Fall break - no class"],
    ["11", "Nov 5", "Response Paper 3 due"],
    ["12", "Nov 12", "Map Quiz 3"],
    ["13", "Nov 17", "Group presentation"],
    ["14", "Nov 19", "Response Paper 4 due by noon"],
    ["15", "Dec 3", "Review session"],
    ["Finals", "Dec 10", "Final Exam, 11:00 AM (35%)"],
]
t = Table(rows, colWidths=[60, 80, 330])
t.setStyle(TableStyle([
    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8e1d3")),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
]))
story.append(t)
doc.build(story)
print("wrote", out)

# A second, prose-style syllabus so demos can upload several PDFs at once
out2 = "public/samples/phys1443-syllabus.pdf"
doc2 = SimpleDocTemplate(out2, pagesize=letter, title="PHYS 1443 Syllabus")
story2 = [
    Paragraph("PHYS 1443 - General Technical Physics I", ss["Title"]),
    Paragraph("UT Arlington &middot; Fall 2026 &middot; MWF 9:00-9:50 AM, SH 101 &middot; Office hours: Thursday 2-4 PM, SH 312", ss["Normal"]),
    Spacer(1, 12),
    Paragraph("Grading", ss["Heading2"]),
    Paragraph("Online homework 20%; Labs 15%; Test 1 20%; Test 2 20%; Final exam 25%.", ss["Normal"]),
    Spacer(1, 12),
    Paragraph("Key dates", ss["Heading2"]),
    Paragraph("Lab 1 report is due September 11th. Test 1 is on Friday, October 2 in class. Lab 4 report due 10/23. "
              "Test 2 will be held Wednesday, November 18 at 7:00 PM in SH 100. Online homework set 9 closes 11/20 at 11:59 PM. "
              "No class on November 27 (Thanksgiving). The final exam is Monday, December 7, 8:00 AM.", ss["Normal"]),
]
doc2.build(story2)
print("wrote", out2)
