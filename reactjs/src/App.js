import React from "react";
import './App.css';
const SampleComponent = React.lazy(() => import("./components/SampleComponent"));

function App() {
  return (
    <div className="App">
      <SampleComponent />
    </div>
  );
}

export default App;
