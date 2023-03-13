import { BrowserRouter, Route, Routes } from 'react-router-dom';
import HomePage from './components/HomePage/HomePage';
import './index.css';

function App() {

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path='/optiapp-module-runner/' element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App
