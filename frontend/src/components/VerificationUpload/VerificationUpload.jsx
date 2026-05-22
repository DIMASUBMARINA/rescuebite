import { useState } from 'react';
import { verificationAPI } from '../../services/api';

function VerificationUpload({ profileType, profileId }) {
  const [documentType, setDocumentType] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await verificationAPI.submit({
        profileType,
        profileId,
        documentType,
        documentUrl,
      });
      setSubmitted(true);
      if (onSubmitted) onSubmitted();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="success-box">
        <p>✅ Document submitted! Waiting for admin review.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="verification-form">
      <h3>Verify Your {profileType}</h3>
      
      {error && <div className="error">{error}</div>}
      
      <div className="form-group">
        <label>Document Type</label>
        <select 
          value={documentType} 
          onChange={(e) => setDocumentType(e.target.value)} 
          required
        >
          <option value="">Select document type</option>
          {profileType === 'RESTAURANT' && (
            <>
              <option value="BUSINESS_LICENSE">Business License</option>
              <option value="FOOD_SAFETY_CERT">Food Safety Certificate</option>
            </>
          )}
          {profileType === 'SHELTER' && (
            <>
              <option value="CHARITY_REGISTRATION">Charity Registration</option>
              <option value="TAX_EXEMPTION">Tax Exemption Certificate</option>
            </>
          )}
          {profileType === 'DRIVER' && (
            <>
              <option value="DRIVERS_LICENSE">Driver's License</option>
              <option value="VEHICLE_REGISTRATION">Vehicle Registration</option>
            </>
          )}
        </select>
      </div>

      <div className="form-group">
        <label>Document URL (mock for now)</label>
        <input
          type="url"
          placeholder="https://example.com/document.pdf"
          value={documentUrl}
          onChange={(e) => setDocumentUrl(e.target.value)}
          required
        />
      </div>
      
      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? 'Submitting...' : 'Submit for Review'}
      </button>
    </form>
  );
}

export default VerificationUpload;