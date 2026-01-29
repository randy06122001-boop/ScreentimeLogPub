const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

class ExportService {
  constructor(documentsPath) {
    this.exportPath = path.join(documentsPath, 'ScreenTimeLog');
    this.ensureExportDirectory();
  }

  ensureExportDirectory() {
    if (!fs.existsSync(this.exportPath)) {
      fs.mkdirSync(this.exportPath, { recursive: true });
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  async exportToPDF(sessions, summary, filename) {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(PDFDocument.StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(PDFDocument.StandardFonts.HelveticaBold);

      let y = height - 50;

      // Title
      page.drawText('Screen Time Report', {
        x: 50,
        y,
        size: 24,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      y -= 40;

      // Date range
      if (sessions.length > 0) {
        const startDate = this.formatDate(sessions[sessions.length - 1].start_time);
        const endDate = this.formatDate(sessions[0].start_time);
        page.drawText(`${startDate} - ${endDate}`, {
          x: 50,
          y,
          size: 12,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
        y -= 40;
      }

      // Summary section
      if (summary) {
        page.drawText('Summary', {
          x: 50,
          y,
          size: 16,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        y -= 25;

        const summaryText = [
          `Total Sessions: ${summary.totalSessions || 0}`,
          `Total Time: ${this.formatDuration(summary.totalSeconds || 0)}`,
          `Average Session: ${this.formatDuration(summary.avgSeconds || 0)}`,
          `Longest Session: ${this.formatDuration(summary.longestSession || 0)}`
        ];

        for (const text of summaryText) {
          page.drawText(text, {
            x: 50,
            y,
            size: 11,
            font,
            color: rgb(0, 0, 0),
          });
          y -= 20;
        }

        y -= 20;
      }

      // Sessions table header
      page.drawText('Sessions', {
        x: 50,
        y,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      y -= 30;

      // Table header
      const headers = ['Date', 'Start Time', 'Duration', 'Status'];
      const headerX = [50, 150, 300, 450];

      headers.forEach((header, index) => {
        page.drawText(header, {
          x: headerX[index],
          y,
          size: 10,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
      });
      y -= 20;

      // Table line
      page.drawLine({
        start: { x: 50, y: y + 5 },
        end: { x: width - 50, y: y + 5 },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7),
      });
      y -= 15;

      // Sessions
      const maxSessions = Math.min(sessions.length, 20); // Limit to 20 sessions per page

      for (let i = 0; i < maxSessions; i++) {
        const session = sessions[i];
        const date = this.formatDate(session.start_time);
        const startTime = new Date(session.start_time).toLocaleTimeString();
        const duration = this.formatDuration(session.duration_seconds);
        const status = session.is_active ? 'Active' : 'Ended';

        const sessionX = [50, 150, 300, 450];
        page.drawText(date, { x: sessionX[0], y, size: 9, font, color: rgb(0, 0, 0) });
        page.drawText(startTime, { x: sessionX[1], y, size: 9, font, color: rgb(0, 0, 0) });
        page.drawText(duration, { x: sessionX[2], y, size: 9, font, color: rgb(0, 0, 0) });
        page.drawText(status, { x: sessionX[3], y, size: 9, font, color: rgb(0, 0, 0) });

        y -= 18;

        if (y < 50) {
          break; // Prevent content overflow
        }
      }

      // Save PDF
      const outputPath = path.join(this.exportPath, `${filename || 'screentime-report'}.pdf`);
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);

      return { success: true, path: outputPath };
    } catch (error) {
      console.error('PDF export error:', error);
      return { success: false, error: error.message };
    }
  }

  async exportToCSV(sessions, filename) {
    try {
      const outputPath = path.join(this.exportPath, `${filename || 'screentime-export'}.csv`);

      const csvWriter = createObjectCsvWriter({
        path: outputPath,
        header: [
          { id: 'id', title: 'ID' },
          { id: 'date', title: 'Date' },
          { id: 'startTime', title: 'Start Time' },
          { id: 'endTime', title: 'End Time' },
          { id: 'duration', title: 'Duration (seconds)' },
          { id: 'durationFormatted', title: 'Duration' },
          { id: 'status', title: 'Status' }
        ]
      });

      const records = sessions.map(session => {
        const startTime = new Date(session.start_time);
        const endTime = session.end_time ? new Date(session.end_time) : null;

        return {
          id: session.id,
          date: startTime.toLocaleDateString(),
          startTime: startTime.toLocaleTimeString(),
          endTime: endTime ? endTime.toLocaleTimeString() : 'N/A',
          duration: session.duration_seconds,
          durationFormatted: this.formatDuration(session.duration_seconds),
          status: session.is_active ? 'Active' : 'Ended'
        };
      });

      await csvWriter.writeRecords(records);

      return { success: true, path: outputPath };
    } catch (error) {
      console.error('CSV export error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ExportService;
