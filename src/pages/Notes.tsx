import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotes,
  createNote,
  deleteNote,
  upgradeTenant,
  getUserData,
  logout as apiLogout,
  type Note,
} from '../api';

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro'>('free');
  
  const navigate = useNavigate();
  const userData = getUserData();

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }
    
    setCurrentPlan(userData.plan || 'free');
    loadNotes();
  }, []);

  async function loadNotes() {
    setIsLoadingNotes(true);
    setError(null);
    
    try {
      const data = await getNotes();
      setNotes(data);
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('unauthorized')) {
        handleLogout();
      } else {
        setError(err.message || 'Failed to load notes');
      }
    } finally {
      setIsLoadingNotes(false);
    }
  }

  async function handleCreateNote() {
    if (!title.trim()) {
      setError('Please enter a title for your note');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      await createNote(title.trim(), content.trim());
      setTitle('');
      setContent('');
      setSuccess('Note created successfully!');
      await loadNotes();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      if (err.code === 'NOTE_LIMIT') {
        setShowLimitModal(true);
      } else {
        setError(err.message || 'Failed to create note');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteNote(id: number) {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await deleteNote(id);
      setSuccess('Note deleted successfully!');
      await loadNotes();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete note');
    }
  }

  async function handleUpgrade() {
    setIsLoading(true);
    setError(null);
    
    try {
      await upgradeTenant(userData.tenantSlug);
      localStorage.setItem('plan', 'pro');
      setCurrentPlan('pro');
      setShowLimitModal(false);
      setSuccess('Successfully upgraded to Pro! You can now create unlimited notes.');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Upgrade failed');
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    apiLogout();
    navigate('/');
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1 className="header-title">My Notes</h1>
          <div className="header-info">
            <span className="badge">{userData.tenantName || userData.tenantSlug}</span>
            <span className={`badge ${currentPlan === 'pro' ? 'badge-success' : 'badge-warning'}`}>
              {currentPlan === 'pro' ? 'Pro Plan' : 'Free Plan'}
            </span>
            <span className={`badge ${userData.role === 'admin' ? 'badge-success' : ''}`}>
              {userData.role === 'admin' ? 'Admin' : 'Member'}
            </span>
            {currentPlan === 'free' && (
              <span className="badge badge-warning">
                {notes.length}/3 notes used
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-3">
          {userData.role === 'admin' && (
            <span className="badge badge-success text-xs">
              Can invite users & upgrade
            </span>
          )}
          <button className="btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Note Creation Form */}
      <section className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Create New Note</h2>
        
        <div className="flex-col gap-4">
          <input
            type="text"
            className="input"
            placeholder="Enter note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
          
          <textarea
            className="textarea"
            placeholder="Enter note content (optional)..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={5000}
          />
          
          <button
            className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
            onClick={handleCreateNote}
            disabled={isLoading || !title.trim()}
          >
            {isLoading ? 'Creating...' : 'Create Note'}
          </button>
        </div>
      </section>

      {/* Status Messages */}
      {error && (
        <div className="alert alert-error mb-4" role="alert">
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success mb-4" role="alert">
          {success}
        </div>
      )}

      {/* Plan Limit Modal */}
      {showLimitModal && (
        <div className="card mb-6" style={{ 
          background: 'rgb(245 158 11 / 0.1)', 
          borderColor: 'rgb(245 158 11 / 0.2)' 
        }}>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--accent-warning)' }}>
            Free Plan Limit Reached
          </h3>
          <p className="text-secondary mb-4">
            You've reached the maximum of 3 notes on the Free plan. 
            Upgrade to Pro for unlimited notes and additional features.
          </p>
          
          <div className="flex gap-3">
            {userData.role === 'admin' ? (
              <button 
                className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                onClick={handleUpgrade}
                disabled={isLoading}
              >
                {isLoading ? 'Upgrading...' : 'Upgrade to Pro'}
              </button>
            ) : (
              <div className="badge badge-warning">
                Ask an Admin to upgrade your tenant to Pro
              </div>
            )}
            
            <button 
              className="btn" 
              onClick={() => setShowLimitModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Your Notes {!isLoadingNotes && `(${notes.length})`}
          </h2>
          
          {!isLoadingNotes && (
            <button className="btn btn-small" onClick={loadNotes}>
              Refresh
            </button>
          )}
        </div>

        {isLoadingNotes ? (
          <div className="card text-center">
            <p className="text-secondary">Loading notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="card text-center">
            <h3 className="text-lg font-medium mb-2">No notes yet</h3>
            <p className="text-secondary">
              Create your first note using the form above!
            </p>
          </div>
        ) : (
          <div className="list">
            {notes.map((note) => (
              <article key={note.id} className="note">
                <div className="note-header">
                  <h3 className="note-title">{note.title}</h3>
                  <button
                    className="btn btn-danger btn-small"
                    onClick={() => handleDeleteNote(note.id)}
                    aria-label={`Delete note: ${note.title}`}
                  >
                    Delete
                  </button>
                </div>
                
                {note.content && (
                  <div className="note-content">
                    {note.content}
                  </div>
                )}
                
                <div className="note-meta">
                  Note #{note.id} • Created {formatDate(note.created_at)}
                  {note.updated_at && note.updated_at !== note.created_at && (
                    <> • Updated {formatDate(note.updated_at)}</>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Plan Information */}
      {currentPlan === 'free' && (
        <section className="card mt-6" style={{ 
          background: 'rgb(34 197 94 / 0.05)', 
          borderColor: 'rgb(34 197 94 / 0.2)' 
        }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--accent-primary)' }}>
            💡 Upgrade to Pro
          </h3>
          <p className="text-xs text-secondary mb-3">
            Get unlimited notes, priority support, and advanced features with our Pro plan.
          </p>
          {userData.role === 'admin' && (
            <button 
              className="btn btn-small btn-primary"
              onClick={() => setShowLimitModal(true)}
            >
              Learn More
            </button>
          )}
        </section>
      )}
    </div>
  );
}