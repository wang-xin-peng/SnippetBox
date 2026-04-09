import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SnippetList } from '../../components/SnippetList';
import { Snippet } from '../../../shared/types';
import Button from '../../components/Button';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateNew = () => {
    navigate('/editor');
  };

  const handleSnippetClick = (snippet: Snippet) => {
    navigate(`/editor/${snippet.id}`);
  };

  const handleSnippetDeleted = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>所有片段</h1>
        <div className="home-actions">
          <Button onClick={handleCreateNew}>新建片段</Button>
        </div>
      </div>
      <div className="home-content">
        <SnippetList
          key={refreshKey}
          onSnippetClick={handleSnippetClick}
          onSnippetDeleted={handleSnippetDeleted}
        />
      </div>
    </div>
  );
}

export default HomePage;
