import React from "react";
import { Button } from "./ui/button";
import Image from "next/image";

const GithubButton = () => {
  const handleGitHubLogin = () => {
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}&scope=user&state=github`;
    window.location.href = githubUrl;
  };

  return (
    <Button
      onClick={handleGitHubLogin}
      className="w-full flex items-center justify-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition duration-300 h-11"
      variant="outline"
    >
      <Image
        src="/github.svg"
        alt="GitHub Logo"
        width={24}
        height={24}
      />
    </Button>
  );
};

export default GithubButton;