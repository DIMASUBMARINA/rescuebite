import { useState, useEffect } from 'react';
import { userAPI } from '../../services/api';

const ALLERGEN_OPTIONS = [
  'GLUTEN', 'DAIRY', 'EGGS', 'FISH', 'SHELLFISH',
  'TREE_NUTS', 'PEANUTS', 'WHEAT', 'SOY', 'SESAME'
];

function AllergyManager() {
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadAllergies();
  }, []);

  const loadAllergies = async () => {
    try {
      const res = await userAPI.getAllergies();
      setAllergies(res.data.data);
    } catch (err) {
      console.error('Failed to load allergies');
    }
  };

  const toggleAllergy = (allergen) => {
    setAllergies(prev => 
      prev.includes(allergen) 
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await userAPI.updateAllergies({ allergens: allergies });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save allergies');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <h3>⚠️ My Allergies</h3>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
        Select allergens to avoid. You will be blocked from ordering items containing these.
      </p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
        {ALLERGEN_OPTIONS.map(allergen => (
          <label 
            key={allergen} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '20px',
              border: `2px solid ${allergies.includes(allergen) ? '#dc3545' : '#ddd'}`,
              background: allergies.includes(allergen) ? '#fff5f5' : 'white',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: allergies.includes(allergen) ? 'bold' : 'normal',
              color: allergies.includes(allergen) ? '#dc3545' : '#333',
            }}
          >
            <input
              type="checkbox"
              checked={allergies.includes(allergen)}
              onChange={() => toggleAllergy(allergen)}
              style={{ display: 'none' }}
            />
            {allergies.includes(allergen) ? '✓ ' : ''}{allergen}
          </label>
        ))}
      </div>
      
      <button 
        className="btn btn-primary" 
        onClick={handleSave}
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Save Allergies'}
      </button>
      
      {saved && (
        <span style={{ color: '#28a745', marginLeft: '10px', fontWeight: 'bold' }}>
          ✅ Saved!
        </span>
      )}
    </div>
  );
}

export default AllergyManager;