
function App() {
  return (
    <div className="container">
      <header className="header">
        <h1>Nadfun Analytics Dashboard</h1>
        <p>Real-time blockchain analytics for Monad testnet</p>
      </header>
      
      <main>
        <div className="metric-card">
          <h2 className="metric-title">Also Bought</h2>
          <div className="metric-value">42</div>
          <p className="metric-description">
            Number of unique tokens also bought by users who purchased this token.
            This metric helps identify related tokens in the ecosystem.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;