import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Audit from './pages/Audit';
import ActionsCorrectives from './pages/ActionsCorrectives';
import OfflineIndicator from './components/OfflineIndicator';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/actions-correctives" element={<ActionsCorrectives />} />
      </Routes>
      <OfflineIndicator />
    </>
  );
}

export default App;

