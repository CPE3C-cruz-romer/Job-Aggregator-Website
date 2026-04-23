import React from 'react';
import { Link } from 'react-router-dom';
import { getNormalizedJobUrl, hasExternalJobUrl } from '../utils/job';

const JobCard = React.memo(({ job, onSave, onApply, canInteract = true, allowApply = false, animationIndex = 0 }) => {
  const jobUrl = getNormalizedJobUrl(job.url);
  const isExternal = hasExternalJobUrl(jobUrl);

  return (
  <article className="card job-card" style={{ '--enter-index': animationIndex }}>
    {job.source === 'employer' && <span className="badge">Direct Employer Post</span>}
    <h3>
      {isExternal ? (
        <a href={jobUrl} target="_blank" rel="noreferrer">{job.title}</a>
      ) : (
        <Link to={`/jobs/${job.id}`}>{job.title}</Link>
      )}
    </h3>
    <p className="muted">{job.company} • {job.location}</p>
    <p className="desc">{job.description?.slice(0, 220)}...</p>
    {(job.contact_name || job.contact_email) && (
      <p className="muted">Contact: {job.contact_name || 'HR'} {job.contact_email ? `• ${job.contact_email}` : ''}</p>
    )}
    <div className="actions">
      {isExternal ? (
        <a href={jobUrl} target="_blank" rel="noreferrer" className="btn-alt">Open</a>
      ) : (
        <Link to={`/jobs/${job.id}`} className="btn-alt">View Details</Link>
      )}
      {canInteract && typeof onSave === 'function' && <button className="btn" onClick={() => onSave(job.id)}>Save</button>}
      {canInteract && allowApply && typeof onApply === 'function' && <button className="btn" onClick={() => onApply(job)}>Continue</button>}
    </div>
  </article>
);
}, (prevProps, nextProps) => {
  return prevProps.job.id === nextProps.job.id && 
         prevProps.animationIndex === nextProps.animationIndex &&
         prevProps.canInteract === nextProps.canInteract;
});

JobCard.displayName = 'JobCard';
export default JobCard;
