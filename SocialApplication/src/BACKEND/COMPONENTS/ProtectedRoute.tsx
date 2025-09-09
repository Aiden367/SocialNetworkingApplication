// components/ProtectedRoute.tsx
import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

interface ProtectedAdminRouteProps {
  children: ReactNode;
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const { userId, token } = useUser();
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchUserRole = async (): Promise<void> => {
      if (!userId || !token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`http://localhost:5000/user/${userId}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (response.ok) {
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [userId, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userId || !token) {
    return <Navigate to="/Login" replace />;
  }

  if (userRole !== 'admin') {
    return <Navigate to="/" replace />; // Redirect non-admins to home
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;