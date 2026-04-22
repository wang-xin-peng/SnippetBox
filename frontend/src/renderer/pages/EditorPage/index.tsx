import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SnippetEditor } from '../../components/SnippetEditor';
import { Snippet } from '../../../shared/types';

function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [snippet, setSnippet] = useState<Snippet | undefined>();
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      loadSnippet(id);
    }
  }, [id]);

  const loadSnippet = async (snippetId: string) => {
    try {
      setLoading(true);
      const api = (window as any).electronAPI;
      const data = await api.snippet.get(snippetId);
      setSnippet(data);
    } catch (error) {
      console.error('Failed to load snippet:', error);
      alert('Failed to load snippet');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    navigate('/');
  };

  const handleCancel = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  return <SnippetEditor snippet={snippet} onSave={handleSave} onCancel={handleCancel} />;
}

export default EditorPage;
