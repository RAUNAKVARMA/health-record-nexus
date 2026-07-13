"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hospital } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const router = useRouter();
  const { login, registerHospital, registerPatient } = useAuth();
  const [loading, setLoading] = useState(false);

  const [loginType, setLoginType] = useState<"hospital" | "patient">("hospital");
  const [email, setEmail] = useState("");
  const [healthId, setHealthId] = useState("");
  const [password, setPassword] = useState("");

  const [hospitalName, setHospitalName] = useState("");
  const [hospitalEmail, setHospitalEmail] = useState("");
  const [hospitalPassword, setHospitalPassword] = useState("");

  const [patientName, setPatientName] = useState("");
  const [patientGender, setPatientGender] = useState<"male" | "female" | "other">("male");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientPassword, setPatientPassword] = useState("");
  const [generatedHealthId, setGeneratedHealthId] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    try {
      const user = await login({
        identifier: loginType === "hospital" ? email : healthId,
        password,
        loginType,
      });
      toast.success("Login successful");
      router.push(user.role === "hospital" ? "/hospital" : "/patient");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleHospitalRegister = async () => {
    setLoading(true);
    try {
      await registerHospital({
        name: hospitalName,
        email: hospitalEmail,
        password: hospitalPassword,
      });
      toast.success("Hospital registered");
      router.push("/hospital");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePatientRegister = async () => {
    setLoading(true);
    try {
      const user = await registerPatient({
        name: patientName,
        phoneNumber: patientPhone,
        gender: patientGender,
        password: patientPassword,
      });
      if (user.healthId) setGeneratedHealthId(user.healthId);
      toast.success(`Welcome! Health ID: ${user.healthId}`);
      router.push("/patient");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-700 text-white mb-4">
            <Hospital className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-cyan-900">Health Record Nexus</h1>
          <p className="text-cyan-700 mt-2">Secure Health Record Exchange System</p>
        </div>

        <Card className="border-cyan-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-cyan-900">Get Started</CardTitle>
            <CardDescription>Login or register as a hospital or patient</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="hospital-reg">Hospital</TabsTrigger>
                <TabsTrigger value="patient-reg">Patient</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <Tabs
                  value={loginType}
                  onValueChange={(v) => setLoginType(v as "hospital" | "patient")}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="hospital">Hospital</TabsTrigger>
                    <TabsTrigger value="patient">Patient</TabsTrigger>
                  </TabsList>
                </Tabs>

                {loginType === "hospital" ? (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hospital@example.com"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="healthId">Health ID</Label>
                    <Input
                      id="healthId"
                      value={healthId}
                      onChange={(e) => setHealthId(e.target.value)}
                      placeholder="14-digit Health ID"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <Button className="w-full" onClick={handleLogin} disabled={loading}>
                  {loading ? "Signing in..." : "Login"}
                </Button>
              </TabsContent>

              <TabsContent value="hospital-reg" className="space-y-4">
                <div className="space-y-2">
                  <Label>Hospital Name</Label>
                  <Input value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={hospitalEmail}
                    onChange={(e) => setHospitalEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={hospitalPassword}
                    onChange={(e) => setHospitalPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleHospitalRegister} disabled={loading}>
                  Register Hospital
                </Button>
              </TabsContent>

              <TabsContent value="patient-reg" className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-cyan-200 bg-white px-3 py-2 text-sm"
                    value={patientGender}
                    onChange={(e) =>
                      setPatientGender(e.target.value as "male" | "female" | "other")
                    }
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={patientPassword}
                    onChange={(e) => setPatientPassword(e.target.value)}
                  />
                </div>
                {generatedHealthId && (
                  <p className="text-sm text-cyan-800 bg-cyan-50 p-3 rounded-md">
                    Your Health ID: <strong>{generatedHealthId}</strong>
                  </p>
                )}
                <Button className="w-full" onClick={handlePatientRegister} disabled={loading}>
                  Register Patient
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="text-xs justify-center text-cyan-700">
            Secure interoperable health record exchange — Smart India Hackathon
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
