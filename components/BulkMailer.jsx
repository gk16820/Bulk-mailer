import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../index.css';

const BulkMailer = () => {
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    recipientFile: null,
    attachment: null
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ]
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'recipientFile') {
        const validTypes = ['.csv', '.xlsx', '.xls'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!validTypes.includes(fileExtension)) {
          alert('Please upload a valid Excel or CSV file');
          e.target.value = '';
          return;
        }
      }
      setFormData(prev => ({
        ...prev,
        [type]: file
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const data = new FormData();
    data.append('subject', formData.subject);
    data.append('body', formData.body);
    data.append('recipientFile', formData.recipientFile);
    if (formData.attachment) {
      data.append('attachment', formData.attachment);
    }

    try {
      const response = await fetch('http://localhost:5000/api/send-bulk-email', {
        method: 'POST',
        body: data
      });

      const result = await response.json();
      
      if (response.ok) {
        setStatus({
          type: 'success',
          message: `Successfully sent ${result.successfulSent} emails`
        });
        // Clear form after successful send
        setFormData({
          subject: '',
          body: '',
          recipientFile: null,
          attachment: null
        });
        document.getElementById('recipientFile').value = '';
        document.getElementById('attachment').value = '';
      } else {
        setStatus({
          type: 'error',
          message: result.error || 'Failed to send emails'
        });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'Error connecting to server'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mailer-container">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Subject</label>
          <input
            type="text"
            className="form-input"
            value={formData.subject}
            onChange={(e) => setFormData({...formData, subject: e.target.value})}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Body</label>
          <div className="quill-container">
            <ReactQuill
              theme="snow"
              value={formData.body}
              onChange={(content) => setFormData({...formData, body: content})}
              modules={modules}
              className="rich-text-editor"
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Recipients File (Excel/CSV)</label>
          <input
            type="file"
            id="recipientFile"
            className="form-input"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => handleFileChange(e, 'recipientFile')}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Attachment (Optional)</label>
          <input
            type="file"
            id="attachment"
            className="form-input"
            onChange={(e) => handleFileChange(e, 'attachment')}
            disabled={loading}
          />
        </div>

        <button 
          type="submit" 
          className="button button-primary button-full"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send Emails'}
        </button>
      </form>

      {status && (
        <div className={`status-message ${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
};

export default BulkMailer;