import { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

const REASONS = [
  ['spam', 'Spam or misleading content'],
  ['harassment', 'Harassment or abusive content'],
  ['personal-information', 'Personal information'],
  ['misinformation', 'False or harmful information'],
  ['other', 'Something else'],
];

export default function ReportDialog({ onSubmit, onCancel }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!reason) {
      setError('Choose a reason so administrators know what to review.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    const result = await onSubmit({ reason, details: details.trim() });
    setIsSubmitting(false);
    if (!result?.success) setError(result?.error || 'Could not submit your report. Please try again.');
  };

  return (
    <ConfirmDialog
      title="Report this feedback?"
      message="Choose the reason that best describes your concern. Your report will be reviewed by an administrator."
      confirmLabel={isSubmitting ? 'Sending…' : 'Submit report'}
      variant="primary"
      confirmDisabled={isSubmitting}
      onCancel={onCancel}
      onConfirm={submit}
    >
      <div className="report-form-fields">
        <label htmlFor="report-reason">Reason</label>
        <select id="report-reason" value={reason} onChange={event => setReason(event.target.value)} disabled={isSubmitting}>
          <option value="">Select a reason</option>
          {REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <label htmlFor="report-details">Additional details <span>(optional)</span></label>
        <textarea
          id="report-details"
          value={details}
          onChange={event => setDetails(event.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Add context to help with the review."
          disabled={isSubmitting}
        />
        <span className="report-character-count">{details.length}/500</span>
        {error && <p className="report-form-error" role="alert">{error}</p>}
      </div>
    </ConfirmDialog>
  );
}
