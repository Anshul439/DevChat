import React from "react";
import { Button } from "./ui/button";
import { Github } from "lucide-react";

const GithubSignInButton = () => {
  const handleGitHubLogin = () => {
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=Ov23lifkpWfABjLTfPVu&scope=user`;
    window.location.href = githubUrl;
  };
  return (
    <Button
      onClick={handleGitHubLogin}
      className="w-full flex items-center justify-center gap-2"
      variant="outline"
    >
      <Github className="w-5 h-5" />
      Continue with GitHub
    </Button>
  );
};

export default GithubSignInButton;
