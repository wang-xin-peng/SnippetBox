import './HomePage.css';

function HomePage() {
  return (
    <div className="home-page">
      <div className="home-header">
        <h1>所有片段</h1>
        <div className="home-actions">
          <input type="search" placeholder="搜索片段..." className="home-search" />
        </div>
      </div>
      <div className="home-content">
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h2>还没有片段</h2>
          <p>点击&ldquo;新建片段&rdquo;开始创建你的第一个代码片段</p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
