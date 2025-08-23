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
    () => localStorage.getItem('token')
  );

  const login = (id: string, token: string) => {
    setUserId(id);
    setToken(token);
    localStorage.setItem('userId', id);
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUserId(null);
    setToken(null);
    localStorage.removeItem('userId');
    localStorage.removeItem('token');
  };

  return (
    <UserContext.Provider value={{ userId, token, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};
