import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  FC,
} from 'react';

type UserContextType = {
  userId: string | null;
  token: string | null;
  login: (id: string, token: string) => void;
  logout: () => void;  
};

const UserContext = createContext<UserContextType>({
  userId: null,
  token: null,
  login: () => {},
  logout: () => {},   
});

export const useUser = () => useContext(UserContext);

export const UserProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(
    () => localStorage.getItem('userId')
  );
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('authToken')  // Changed from 'token' to 'authToken'
  );

  const login = (id: string, token: string) => {
    setUserId(id);
    setToken(token);
    localStorage.setItem('userId', id);
    localStorage.setItem('authToken', token);  // Changed from 'token' to 'authToken'
  };

  const logout = () => {
    setUserId(null);
    setToken(null);
    localStorage.removeItem('userId');
    localStorage.removeItem('authToken');  // Changed from 'token' to 'authToken'
  };

  return (
    <UserContext.Provider value={{ userId, token, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};