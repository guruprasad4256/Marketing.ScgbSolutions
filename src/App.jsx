import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "@/components/auth/Login";
import BlogEditor from "./pages/BlogEditor"; 
import ProtectedRoute from "@/context/ProtectedRoutes";
import { Toaster } from "@/components/ui/sonner";
import { UserProvider } from "@/context/UserContext";

export default function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <UserProvider>
        <BrowserRouter>
          <Routes>
            {/* --- Login Page --- */}
            <Route path="/" element={<Login />} />
            
            {/* --- Blog Editor Page (Protected) --- */}
            <Route
              path="/blog-editor"
              element={
                <ProtectedRoute allowedRoles={["isAdmin", "isSales"]}>
                  <BlogEditor />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </>
  );
}