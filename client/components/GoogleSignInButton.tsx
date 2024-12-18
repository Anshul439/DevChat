import React, { FC, ReactNode } from "react";
import { Button } from "./ui/button";

interface GoogleSignInButtonProps {
  children: ReactNode;
}

const GoogleSignInButton: FC<GoogleSignInButtonProps> = ({ children }) => {
  const loginInGoogle = () => console.log("login with google");

  return (
    <Button onClick={loginInGoogle} className="w-full">
      {children}
    </Button>
  );
};

export default GoogleSignInButton;
