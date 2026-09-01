import React, { useState } from 'react';
import Modal from './Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

/**
 * Reusable bulk-import modal. Usage:
 *   <ImportExcelModal targetType="assets" onClose={...} onDone={...} />
 * targetType must match a key in electron/ipc/import.js's SPECS.
 */
export default function ImportExcelModal({ targetType, label, onClose, onDone }) {
  const { user } = useAuth();
  const { push } = useToast();
  const [filePath, setFilePath] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);

  const browse = async () => {
    let res;
    try {
      res = await window.api.importBrowseFile();
    } catch (err) {
      push(err.message || 'Could not open the file picker. Check that the app was rebuilt with the import patch.', 'error');
      return;
    }
    if (res.canceled) return;
    setFilePath(res.path);
    setResult(null);
    try {
      const p = await window.api.importPreview({ targetType, filePath: res.path });
      setPreview(p);
    } catch (err) {
      push(err.message || 'Could not read that file.', 'error');
      setFilePath(null);
    }
  };

  const runImport = async () => {
    setImporting(true);
    try {
      const res = await window.api.importRun({ actor: user, targetType, filePath });
      setResult(res);
      if (res.created > 0) onDone?.();
    } catch (err) {
      push(err.message || 'Import failed.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await window.api.importDownloadTemplate({ targetType });
      if (!res.canceled) push(`Template saved to ${res.path}`);
    } catch (err) {
      push(err.message || 'Could not generate the template.', 'error');
    }
  };

  return (
    <Modal
      title={`Import ${label} from Excel`}
      onClose={onClose}
      width={640}
      footer={
        <>
          <button className="btn" onClick={onClose}>Close</button>
          {preview && !result && (
            <button className="btn btn-primary" onClick={runImport} disabled={importing}>
              {importing ? 'Importing…' : `Import ${preview.totalRows} row${preview.totalRows === 1 ? '' : 's'}`}
            </button>
          )}
        </>
      }
    >
      {!filePath && (
        <div>
          <p className="text-muted" style={{ fontSize: 13, marginTop: 0 }}>
            Upload an .xlsx, .xls, or .csv file. The first row must be column headers.
          </p>
          <div className="toolbar">
            <button className="btn btn-primary" onClick={browse}>Choose file…</button>
            <button className="btn" onClick={downloadTemplate}>Download template</button>
          </div>
        </div>
      )}

      {preview && !result && (
        <div>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Found <strong>{preview.totalRows}</strong> row(s). Required columns:{' '}
            <span className="mono">{preview.requiredHeaders.join(', ')}</span>
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>{preview.allHeaders.map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.preview.map((row, i) => (
                  <tr key={i}>
                    {preview.allHeaders.map((h) => (
                      <td key={h} className="text-muted">{String(Object.values(row)[preview.allHeaders.indexOf(h)] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.totalRows > preview.preview.length && (
            <p className="text-faint" style={{ fontSize: 11.5 }}>Showing first {preview.preview.length} rows.</p>
          )}
        </div>
      )}

      {result && (
        <div>
          <p style={{ fontSize: 14 }}>
            <strong style={{ color: 'var(--accent-teal)' }}>{result.created}</strong> of {result.totalRows} rows imported successfully.
          </p>
          {result.errors.length > 0 && (
            <>
              <p className="text-muted" style={{ fontSize: 13 }}>{result.errors.length} row(s) skipped:</p>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Row</th><th>Reason</th></tr></thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i}><td className="mono">{e.row}</td><td className="text-muted">{e.reason}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
