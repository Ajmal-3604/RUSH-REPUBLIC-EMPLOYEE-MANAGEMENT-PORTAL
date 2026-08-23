import React from 'react';
import { formatDate, formatTime } from '../../utils/format';
import { NoteBlock } from './PrintableSections';

/**
 * Complete, nothing-omitted print renderers for Shoot Details / Reels /
 * Photos -- unlike the lighter summary in PrintableSections.js (used by
 * Review & Approval), these read every field and every uploaded image
 * straight off the same `plan` object the actual wizard steps write to.
 * No separate data source, no hardcoded values -- if a field isn't set on
 * `plan`, it just renders as "—" the same way the rest of the app does.
 */

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function ImageBlock({ label, images, aspect }) {
  if (!images || images.length === 0) {
    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: 'rgba(0,0,0,.5)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.4)' }}>None uploaded</div>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 8, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <div style={{ fontSize: 11, color: 'rgba(0,0,0,.5)', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {images.map((img) => (
          <img
            key={img.id}
            src={img.image}
            alt=""
            style={{
              width: aspect === 'portrait' ? 90 : 120,
              height: aspect === 'portrait' ? 160 : 90,
              objectFit: 'cover',
              borderRadius: 6,
              border: '1px solid rgba(0,0,0,.12)',
              breakInside: 'avoid',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SubCard({ children }) {
  return (
    <div
      style={{
        border: '1px solid rgba(0,0,0,.1)',
        borderRadius: 6,
        padding: 12,
        marginTop: 10,
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
      }}
    >
      {children}
    </div>
  );
}

function AssignedModelFull({ model }) {
  const refPhotos = (model.photos || []).filter((p) => p.category === 'COSTUME_COLOR_REF');
  const costumePhotos = (model.photos || []).filter((p) => p.category === 'COSTUME');
  return (
    <SubCard>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: '50%', background: '#0e0e0e', color: '#fff',
            fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flex: 'none', overflow: 'hidden',
          }}
        >
          {model.directory_model_photo ? (
            <img src={model.directory_model_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initials(model.name)
          )}
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Model — {model.name}</div>
          {(model.directory_model_age || model.directory_model_gender_display) && (
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,.5)' }}>
              Age {model.directory_model_age || '—'} · {model.directory_model_gender_display || '—'}
            </div>
          )}
        </div>
      </div>
      <div className="rr-review-fields" style={{ marginTop: 8 }}>
        <div>
          <span className="field-label">Agreed time in</span>
          <b>{model.time_in ? formatTime(model.time_in) : '—'}</b>
        </div>
        <div>
          <span className="field-label">Agreed time out</span>
          <b>{model.time_out ? formatTime(model.time_out) : '—'}</b>
        </div>
      </div>
      <ImageBlock label="Costume reference images" images={refPhotos} />
      <ImageBlock label="Model costume images" images={costumePhotos} />
      <NoteBlock label="Notes" value={model.directory_model_notes} />
    </SubCard>
  );
}

function AssignedLocationFull({ location }) {
  return (
    <SubCard>
      <div style={{ fontSize: 13.5, fontWeight: 700 }}>Location — {location.name || 'Untitled'}</div>
      <div className="rr-review-fields" style={{ marginTop: 8 }}>
        <div>
          <span className="field-label">Address</span>
          <b>{location.address || '—'}</b>
        </div>
        <div>
          <span className="field-label">Map URL</span>
          <b>{location.map_url || '—'}</b>
        </div>
        <div>
          <span className="field-label">Permit status</span>
          <b>{location.permit_status_display || '—'}</b>
        </div>
        <div>
          <span className="field-label">On-site contact</span>
          <b>{location.contact_name || '—'}</b>
        </div>
        <div>
          <span className="field-label">Contact phone</span>
          <b>{location.contact_phone || '—'}</b>
        </div>
        <div>
          <span className="field-label">Agreed time in / out</span>
          <b>
            {location.time_in ? formatTime(location.time_in) : '—'} – {location.time_out ? formatTime(location.time_out) : '—'}
          </b>
        </div>
      </div>
      <NoteBlock label="Access notes" value={location.access_notes} />
      <ImageBlock label="Location photos" images={location.photos || []} />
    </SubCard>
  );
}

function AssignedPropFull({ prop }) {
  return (
    <SubCard>
      <div style={{ fontSize: 13.5, fontWeight: 700 }}>Prop — {prop.name || 'Untitled'}</div>
      <div className="rr-review-fields" style={{ marginTop: 8 }}>
        <div>
          <span className="field-label">Quantity</span>
          <b>{prop.quantity ?? '—'}</b>
        </div>
        <div>
          <span className="field-label">Source</span>
          <b>{prop.source_display || '—'}</b>
        </div>
        <div>
          <span className="field-label">Status</span>
          <b>{prop.status_display || '—'}</b>
        </div>
        <div>
          <span className="field-label">Unit cost (₹)</span>
          <b>{prop.unit_cost ?? '—'}</b>
        </div>
      </div>
      <NoteBlock label="Notes" value={prop.notes} />
      <ImageBlock label="Reference photos" images={prop.photos || []} />
    </SubCard>
  );
}

function AssignedEntities({ plan, item }) {
  const modelPool = plan?.plan_models || [];
  const locationPool = plan?.plan_locations || [];
  const propPool = plan?.props || [];
  const models = modelPool.filter((m) => (item.assigned_models || []).includes(m.id));
  const locations = locationPool.filter((l) => (item.assigned_locations || []).includes(l.id));
  const props_ = propPool.filter((p) => (item.assigned_props || []).includes(p.id));

  if (models.length === 0 && locations.length === 0 && props_.length === 0) return null;

  return (
    <div style={{ marginTop: 10 }}>
      {models.map((m) => <AssignedModelFull key={`model-${m.id}`} model={m} />)}
      {locations.map((l) => <AssignedLocationFull key={`location-${l.id}`} location={l} />)}
      {props_.map((p) => <AssignedPropFull key={`prop-${p.id}`} prop={p} />)}
    </div>
  );
}

export function PrintShootDetailsFull({ plan }) {
  const crew = plan?.crew || [];
  const freelancerCrew = crew.filter((c) => c.person_type === 'FREELANCER');

  return (
    <div className="rr-review-section">
      <div className="rr-review-section__title" style={{ marginBottom: 12 }}>
        Shoot Details
      </div>
      <div className="rr-review-fields">
        <div>
          <span className="field-label">Shoot title</span>
          <b>{plan?.title || '—'}</b>
        </div>
        <div>
          <span className="field-label">Shoot date</span>
          <b>{formatDate(plan?.shoot_date)}</b>
        </div>
        <div>
          <span className="field-label">Start time / End time</span>
          <b>
            {plan?.call_time ? formatTime(plan.call_time) : '—'} – {plan?.wrap_time ? formatTime(plan.wrap_time) : '—'}
          </b>
        </div>
        <div>
          <span className="field-label">Brand</span>
          <b>{plan?.brand_name || plan?.client_name || '—'}</b>
        </div>
        <div>
          <span className="field-label">Client Servicing Manager</span>
          <b>{plan?.brand_client_servicing || '—'}</b>
        </div>
        <div>
          <span className="field-label">Social Media Specialist</span>
          <b>{plan?.brand_social_media_specialist || '—'}</b>
        </div>
        <div>
          <span className="field-label">Production Coordinator</span>
          <b>{plan?.brand_production_coordinator || '—'}</b>
        </div>
        <div>
          <span className="field-label">Script Writer</span>
          <b>{plan?.brand_script_writer || '—'}</b>
        </div>
        <div>
          <span className="field-label">Production Head</span>
          <b>{plan?.brand_production_head || '—'}</b>
        </div>
        <div>
          <span className="field-label">Client notified about shoot and timings?</span>
          <b>{plan?.client_notified ? 'Yes' : 'No'}</b>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ breakInside: 'avoid' }}>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,.5)', marginBottom: 4 }}>Brand Logo</div>
          {plan?.brand_logo ? (
            <img
              src={plan.brand_logo}
              alt=""
              style={{ width: 140, height: 90, objectFit: 'contain', borderRadius: 6, border: '1px solid rgba(0,0,0,.1)', background: '#f7f7f5' }}
            />
          ) : (
            <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.4)' }}>No logo uploaded</div>
          )}
        </div>
        <div style={{ breakInside: 'avoid' }}>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,.5)', marginBottom: 4 }}>Brand Color Palette</div>
          {plan?.brand_palette ? (
            <img
              src={plan.brand_palette}
              alt=""
              style={{ width: 220, aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(0,0,0,.1)' }}
            />
          ) : (
            <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.4)' }}>No palette image uploaded</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, color: 'rgba(0,0,0,.5)', marginBottom: 6 }}>Freelancer(s)</div>
        {freelancerCrew.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.4)' }}>None added</div>
        ) : (
          freelancerCrew.map((fc) => (
            <div key={fc.id} style={{ fontSize: 13, marginBottom: 4 }}>
              <b>{fc.name}</b>
              <span style={{ color: 'rgba(0,0,0,.5)' }}>
                {' '}
                — In {fc.call_time ? formatTime(fc.call_time) : '—'} · Out {fc.time_out ? formatTime(fc.time_out) : '—'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function PrintReelsFull({ plan }) {
  const reels = plan?.reels || [];
  return (
    <div className="rr-review-section">
      <div className="rr-review-section__title" style={{ marginBottom: 12 }}>
        Reels ({reels.length})
      </div>
      {reels.length === 0 && <div style={{ fontSize: 13, color: 'rgba(0,0,0,.5)' }}>No reels added.</div>}
      {reels.map((r, idx) => {
        const storyboard = (r.photos || []).filter((p) => p.category === 'STORYBOARD');
        return (
          <div key={r.id} className="rr-review-item" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div className="rr-review-item__title">Reel {idx + 1} — {r.title || 'Untitled'}</div>
            <div className="rr-review-fields">
              <div>
                <span className="field-label">Reference link</span>
                <b>{r.reference_link || '—'}</b>
              </div>
              <div>
                <span className="field-label">Platform</span>
                <b>{r.platform_display || '—'}</b>
              </div>
              <div>
                <span className="field-label">Duration</span>
                <b>{r.duration_seconds ? `${r.duration_seconds}s` : '—'}</b>
              </div>
            </div>
            <NoteBlock label="Script" value={r.concept} />
            <NoteBlock label="Notes to editor" value={r.notes} />
            <NoteBlock label="Photographer/Videographer notes" value={r.photographer_notes} />
            <ImageBlock label="Storyboard (9:16 frames)" images={storyboard} aspect="portrait" />
            <AssignedEntities plan={plan} item={r} />
          </div>
        );
      })}
    </div>
  );
}

export function PrintPhotosFull({ plan }) {
  const photoBriefs = plan?.photos || [];
  return (
    <div className="rr-review-section">
      <div className="rr-review-section__title" style={{ marginBottom: 12 }}>
        Photos ({photoBriefs.length})
      </div>
      {photoBriefs.length === 0 && <div style={{ fontSize: 13, color: 'rgba(0,0,0,.5)' }}>No photo briefs added.</div>}
      {photoBriefs.map((p, idx) => {
        const moodboard = (p.photos || []).filter((ph) => ph.category === 'MOODBOARD');
        return (
          <div key={p.id} className="rr-review-item" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div className="rr-review-item__title">Shot {idx + 1} — {p.description || p.title || 'Untitled'}</div>
            <div className="rr-review-fields">
              <div>
                <span className="field-label">Number of Photos</span>
                <b>{p.quantity || '—'}</b>
              </div>
              <div>
                <span className="field-label">Shot type</span>
                <b>{p.shot_type_display || '—'}</b>
              </div>
            </div>
            {(p.reference_links || []).length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,.5)', marginBottom: 4 }}>Reference Links</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                  {p.reference_links.map((link) => (
                    <li key={link.id} style={{ wordBreak: 'break-all' }}>{link.url}</li>
                  ))}
                </ul>
              </div>
            )}
            <NoteBlock label="Notes to designer" value={p.notes_to_designer} />
            <ImageBlock label="Moodboard / shot references (9:16)" images={moodboard} aspect="portrait" />
            <AssignedEntities plan={plan} item={p} />
          </div>
        );
      })}
    </div>
  );
}
