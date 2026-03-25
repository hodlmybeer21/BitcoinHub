import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, User, Users, Bitcoin, TrendingUp, BookOpen, Shield, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Landing = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activeTab, setActiveTab] = useState("login");
  // Temporary auth bypass while implementing authentication
  const login = async () => {};
  const register = async () => {};
  const continueAsGuest = () => window.location.href = "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    try {
      await login(username, password);
    } catch (error) {
      // Error is handled by the auth context
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || password !== confirmPassword) return;
    
    try {
      await register(username, password);
    } catch (error) {
      // Error is handled by the auth context
    }
  };

  const features = [
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Real-time Market Data",
      description: "Live Bitcoin prices, charts, and comprehensive market analysis"
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Learning Hub",
      description: "Interactive courses and tutorials to master Bitcoin knowledge"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Portfolio Tracking",
      description: "Secure portfolio management with advanced analytics"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Trading Simulator",
      description: "Test strategies with historical backtesting capabilities"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primary/10 p-3 rounded-full mr-4">
              <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="16" fill="#F7931A"/>
                <path d="M22.5 14.2c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.4-.1-.7-.2-1-.2l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .2.1h-.2l-1.2 4.7c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c3 .6 5.2.3 6.1-2.4.8-2.1 0-3.4-1.6-4.2 1.1-.3 2-1 2.2-2.5zm-4 5.5c-.6 2.1-4.2 1-5.4.7l1 3.9c1.2.3 4.8.9 5.3-.6.4-1.3-.3-2.6-1.9-3zm.6-5.5c-.5 1.9-3.7.9-4.7.7l.9-3.6c1.1.3 4.4.8 4.8 1.1.4.4.3 1.6-.6 1.8h-.4z" fill="white"/>
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              BitcoinHub
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Your comprehensive Bitcoin trading platform with AI-powered insights, 
            real-time data, and educational resources
          </p>
          
          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {features.map((feature, index) => (
              <Card key={index} className="border-muted/50 hover:border-primary/50 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Auth Section */}
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg border-muted/50">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Get Started</CardTitle>
              <CardDescription>
                Sign in to save your progress or continue as a guest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="register" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Username</Label>
                      <Input
                        id="login-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                      Sign In
                    </Button>
                  </form>
                  
                  <div className="text-center">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Signed-in users can save learning progress, portfolio data, and custom settings
                      </AlertDescription>
                    </Alert>
                  </div>
                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-username">Username</Label>
                      <Input
                        id="register-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose a username"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        required
                      />
                    </div>
                    
                    {password && confirmPassword && password !== confirmPassword && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Passwords do not match
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={!password || password !== confirmPassword}
                    >
                      Create Account
                    </Button>
                  </form>
                  
                  <div className="text-center">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Create an account to track your learning progress and save portfolio data
                      </AlertDescription>
                    </Alert>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full border-dashed border-muted-foreground/50 hover:border-primary"
                onClick={continueAsGuest}
              >
                <Users className="h-4 w-4 mr-2" />
                Continue as Guest
              </Button>
              
              <div className="text-center">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Guest mode provides full access but doesn't save your progress
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* Benefits Section */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="bg-primary/10 text-primary">
                    <User className="h-3 w-3 mr-1" />
                    Account
                  </Badge>
                  <span className="text-sm font-medium">Save Progress</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Learning completion, portfolio history, custom alerts
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    Guest
                  </Badge>
                  <span className="text-sm font-medium">Quick Access</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Full features, no sign-up required, session-based
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;