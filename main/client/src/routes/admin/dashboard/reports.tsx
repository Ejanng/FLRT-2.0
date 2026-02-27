import { createFileRoute } from '@tanstack/react-router';
import AdminDashboard from '../../../components/adminDashboard';
import { useState, useEffect } from 'react';

const CLAIM_PUBLISH_TRIGGER_KEY = 'claimableReportsRefreshToken';

type ReportRow = {
  id: string;
  item: string;
  description: string;
  location: string;
  date: string;
  status: string;
};

export const Route = createFileRoute('/admin/dashboard/reports')({
  component: ReportsPage,
});

function ReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [publishStatus, setPublishStatus] = useState<'success' | 'error' | ''>('');

  const isPublishedStatus = (status: string) => status.startsWith('published');

  // Function to fetch reports from the API
  const fetchReports = async () => {
    try {
      const response = await fetch('http://localhost:5000/reports/all-reports');
      if (response.ok) {
        const data = await response.json();
        const mappedReports: ReportRow[] = (data.reports || []).map((report: any) => ({
          id: String(report.report_id),
          item: report.item_name || '',
          description: report.description || '',
          location: report.location || '',
          date: report.date_reported ? new Date(report.date_reported).toLocaleDateString() : '',
          status: report.status || '',
        }));
        setReports(mappedReports);
      } else {
        console.error('Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  // Fetch reports on mount
  useEffect(() => {
    fetchReports();
  }, []);

  const handleViewClick = (row: ReportRow) => {
    setSelectedReport(row);
    setIsFormVisible(true);
    setPublishMessage('');
    setPublishStatus('');
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
    setSelectedReport(null);
    setPublishMessage('');
    setPublishStatus('');
  };

  const handlePublish = async () => {
    if (!selectedReport) return;

    if (isPublishedStatus(selectedReport.status)) {
      setPublishStatus('success');
      setPublishMessage('This report is already published to Claim routes.');
      return;
    }

    const reportId = Number(selectedReport.id);
    if (!Number.isFinite(reportId)) {
      setPublishStatus('error');
      setPublishMessage('Invalid report ID.');
      return;
    }

    setIsPublishing(true);
    setPublishMessage('');
    setPublishStatus('');

    try {
      const response = await fetch('http://localhost:5000/reports/publish-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report_id: reportId }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage = data?.error || 'Failed to publish report.';
        setPublishStatus('error');
        setPublishMessage(errorMessage);
        return;
      }

      setPublishStatus('success');
      setPublishMessage('Report published successfully. It is now available in Claim routes.');
      localStorage.setItem(CLAIM_PUBLISH_TRIGGER_KEY, String(Date.now()));

      // Update the report's status to published in local state
      setReports((prev) =>
        prev.map((report) =>
          report.id === selectedReport.id ? { ...report, status: 'published' } : report
        )
      );

      setSelectedReport((prev) =>
        prev ? { ...prev, status: 'published' } : prev
      );

      // Fetch the updated reports list after publishing the report
      fetchReports();
    } catch (error) {
      console.error('Error publishing report:', error);
      setPublishStatus('error');
      setPublishMessage('An error occurred while publishing report.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <AdminDashboard>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Item</th>
              <th>Description</th>
              <th>Status</th>
              <th>Location</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={7}>No reports available</td>
              </tr>
            ) : (
              reports.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.item}</td>
                  <td>{row.description}</td>
                  <td>{row.status}</td>
                  <td>{row.location}</td>
                  <td>{row.date}</td>
                  <td>
                    <span className="view-link" onClick={() => handleViewClick(row)}>
                      View
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Form Popup */}
      {isFormVisible && selectedReport && (
        <div className="popup-form-overlay">
          <div className="popup-form-content">
            <h2>View Report: {selectedReport.id}</h2>

            <form className="popup-form">
              {publishMessage && (
                <div className={`admin-inline-message ${publishStatus}`}>
                  {publishMessage}
                </div>
              )}
              <div className="form-group">
                <label htmlFor="reportItem">Item:</label>
                <input id="reportItem" type="text" value={selectedReport.item} readOnly />
              </div>
              <div className="form-group">
                <label htmlFor="date">Date:</label>
                <input id="date" type="text" value={selectedReport.date} readOnly />
              </div>
              <div className="form-group">
                <label>Status:</label>
                <input type="text" value={selectedReport.status} readOnly />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="accept-btn"
                  onClick={handlePublish}
                  disabled={isPublishing}
                >
                  {isPublishing ? 'Publishing...' : 'Publish'}
                </button>
                <button type="button" className="close-btn" onClick={handleCloseForm}>
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminDashboard>
  );
}

export default ReportsPage;