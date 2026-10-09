import { Link, Route, Routes } from "react-router-dom";
import { AccountProvider } from "./state/AccountContext";
import { FilterProvider } from "./state/FilterContext";
import Layout from "./components/Layout";
import Home from "./routes/Home";
import Playlist from "./routes/Playlist";
import Drill from "./routes/Drill";
import Login from "./routes/Login";
import Profile from "./routes/Profile";

const NotFound = () => (
  <div className="panel">
    <p className="lbl">Page not found</p>
    <p className="note">
      <Link className="link" to="/">
        ← Back to the drills
      </Link>
    </p>
  </div>
);

export default function App() {
  return (
    <AccountProvider>
      <FilterProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="p/:playlist" element={<Playlist />} />
            <Route path="login" element={<Login />} />
            <Route path="profile" element={<Profile />} />
            <Route path="q/:id" element={<Drill />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </FilterProvider>
    </AccountProvider>
  );
}
