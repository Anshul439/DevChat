import React from "react";
import { Button } from "./ui/button";
import { FaGithub } from "react-icons/fa"; 

const GithubButton = () => {
  const handleGitHubLogin = () => {
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}&scope=user&state=github`;
    window.location.href = githubUrl;
    console.log(process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID);
    
  };
  return (
    <Button
      onClick={handleGitHubLogin}
      className="w-full flex items-center justify-center gap-2"
      variant="outline"
    >
      <FaGithub className="w-5 h-5" /> 
      Continue with GitHub
    </Button>
  );
};

export default GithubButton;
