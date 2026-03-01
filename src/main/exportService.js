const { jsPDF } = require('jspdf');
require('jspdf-autotable');
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
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text('Screen Time Report', 14, 22);
      
      // Date range
      if (sessions.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        const startDate = this.formatDate(sessions[sessions.length - 1].start_time);
        const endDate = this.formatDate(sessions[0].start_time);
        doc.text(`${startDate} - ${endDate}`, 14, 32);
      }
      
      // Summary section
      let yPos = 45;
      if (summary) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Summary', 14, yPos);
        yPos += 10;
        
        doc.setFontSize(10);
        const summaryData = [
          ['Total Sessions', (summary.session_count || 0).toString()],
          ['Total Time', this.formatDuration(summary.total_seconds || 0)],
          ['Longest Session', this.formatDuration(summary.longest_session || 0)]
        ];
        
        doc.autoTable({
          startY: yPos,
          head: [],
          body: summaryData,
          theme: 'plain',
          styles: { fontSize: 10 },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { cellWidth: 50 }
          }
        });
        
        yPos = doc.lastAutoTable.finalY + 15;
      }
      
      // Sessions table
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Sessions', 14, yPos);
      yPos += 5;
      
      const tableData = sessions.slice(0, 50).map(session => [
        this.formatDate(session.start_time),
        new Date(session.start_time).toLocaleTimeString(),
        session.end_time ? new Date(session.end_time).toLocaleTimeString() : 'Active',
        this.formatDuration(session.duration_seconds),
        session.is_active ? 'Active' : 'Ended'
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Date', 'Start Time', 'End Time', 'Duration', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 },
          4: { cellWidth: 25 }
        }
      });
      
      // Save PDF
      const outputPath = path.join(this.exportPath, `${filename || 'screentime-report'}.pdf`);
      fs.writeFileSync(outputPath, doc.output('arraybuffer'));

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
