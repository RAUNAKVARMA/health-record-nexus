"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Hospital,
  LogOut,
  FileUp,
  Search,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Patient = {
  id: string;
  name: string;
  healthId: string;
  gender: string;
  phoneNumber: string;
};

type MedicalRecord = {
  id: string;
  recordType: string;
  fileName: string;
  notes: string | null;
  createdAt: string;
  hospital: { id: string; name: string };
};

export default function HospitalDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientGender, setPatientGender] = useState<"male" | "female" | "other">("male");
  const [patientPassword, setPatientPassword] = useState("");
  const [generatedHealthId, setGeneratedHealthId] = useState("");

  const [uploadHealthId, setUploadHealthId] = useState("");
  const [recordType, setRecordType] = useState("Prescription");
  const [recordNotes, setRecordNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [patientFound, setPatientFound] = useState<Patient | null>(null);

  const [accessHealthId, setAccessHealthId] = useState("");
  const [accessibleRecords, setAccessibleRecords] = useState<MedicalRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const handleGenerateHealthId = async () => {
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: patientName,
        phoneNumber: patientPhone,
        gender: patientGender,
        password: patientPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to register patient");
      return;
    }
    setGeneratedHealthId(data.healthId);
    toast.success(`Patient registered. Health ID: ${data.healthId}`);
  };

  const handleVerifyPatient = async () => {
    const res = await fetch(`/api/patients?healthId=${encodeURIComponent(uploadHealthId)}`);
    const data = await res.json();
    if (!res.ok) {
      setPatientFound(null);
      toast.error(data.error || "Patient not found");
      return;
    }
    setPatientFound(data);
    toast.success(`Patient found: ${data.name}`);
  };

  const handleUploadRecord = async () => {
    if (!patientFound || !file) {
      toast.error("Verify patient and select a file first");
      return;
    }
    const form = new FormData();
    form.append("healthId", patientFound.healthId);
    form.append("recordType", recordType);
    form.append("notes", recordNotes);
    form.append("file", file);

    const res = await fetch("/api/records", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Upload failed");
      return;
    }
    toast.success("Record uploaded. Waiting for patient consent.");
    setUploadHealthId("");
    setRecordType("Prescription");
    setRecordNotes("");
    setFile(null);
    setPatientFound(null);
  };

  const handleRequestAccess = async () => {
    const res = await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ healthId: accessHealthId }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Request failed");
      return;
    }
    if (data.alreadyExists && data.status === "approved") {
      toast.success("Access already granted");
    } else if (data.alreadyExists) {
      toast.info("Access request already pending");
    } else {
      toast.success("Access requested. Waiting for patient approval.");
    }
  };

  const handleViewApprovedRecords = async () => {
    setLoadingRecords(true);
    const res = await fetch(`/api/records?healthId=${encodeURIComponent(accessHealthId)}`);
    const data = await res.json();
    setLoadingRecords(false);
    if (!res.ok) {
      toast.error(data.error || "Failed to load records");
      return;
    }
    setAccessibleRecords(data);
    toast.success(data.length ? `Found ${data.length} records` : "No approved records found");
  };

  const downloadRecord = (recordId: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = `/api/files/${recordId}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-700 to-teal-800">
      <header className="bg-white/10 backdrop-blur border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <Hospital className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">Health Record Nexus</h1>
              <p className="text-cyan-100 text-sm">Hospital Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white text-sm hidden sm:block">
              {session?.user?.name}
            </span>
            <Button
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/30"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="generate">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/90">
            <TabsTrigger value="generate">Generate Health ID</TabsTrigger>
            <TabsTrigger value="upload">Upload Record</TabsTrigger>
            <TabsTrigger value="access">Access Records</TabsTrigger>
          </TabsList>

          <TabsContent value="generate">
            <Card>
              <CardHeader>
                <CardTitle>Generate Patient Health ID</CardTitle>
                <CardDescription>Register a new patient and generate their 14-digit Health ID</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
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
                      onChange={(e) => setPatientGender(e.target.value as "male" | "female" | "other")}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" value={patientPassword} onChange={(e) => setPatientPassword(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleGenerateHealthId}>
                  Generate Health ID
                </Button>
                {generatedHealthId && (
                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                    <p className="text-sm text-cyan-800">Generated Health ID</p>
                    <p className="text-2xl font-mono font-bold text-cyan-900">{generatedHealthId}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Medical Record</CardTitle>
                <CardDescription>Upload a record for a patient (requires patient consent)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Patient Health ID"
                    value={uploadHealthId}
                    onChange={(e) => setUploadHealthId(e.target.value)}
                  />
                  <Button variant="outline" onClick={handleVerifyPatient}>
                    <Search className="w-4 h-4 mr-2" />
                    Verify
                  </Button>
                </div>
                {patientFound && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                    Verified: <strong>{patientFound.name}</strong> ({patientFound.healthId})
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Record Type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-cyan-200 bg-white px-3 py-2 text-sm"
                    value={recordType}
                    onChange={(e) => setRecordType(e.target.value)}
                  >
                    <option>Prescription</option>
                    <option>Lab Report</option>
                    <option>Discharge Summary</option>
                    <option>Radiology Report</option>
                    <option>Consultation Note</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Upload File</Label>
                  <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea value={recordNotes} onChange={(e) => setRecordNotes(e.target.value)} />
                </div>
                <Button onClick={handleUploadRecord}>
                  <FileUp className="w-4 h-4 mr-2" />
                  Upload Record
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access">
            <Card>
              <CardHeader>
                <CardTitle>Access Patient Records</CardTitle>
                <CardDescription>Request permission to view a patient&apos;s medical records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Patient Health ID"
                    value={accessHealthId}
                    onChange={(e) => setAccessHealthId(e.target.value)}
                  />
                  <Button variant="outline" onClick={handleRequestAccess}>Request Access</Button>
                </div>
                <Button onClick={handleViewApprovedRecords} disabled={loadingRecords || !accessHealthId}>
                  {loadingRecords ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "View Approved Records"
                  )}
                </Button>
                {accessibleRecords.length > 0 ? (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-cyan-50">
                        <tr>
                          <th className="text-left p-3">Type</th>
                          <th className="text-left p-3">Date</th>
                          <th className="text-left p-3">Hospital</th>
                          <th className="text-left p-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accessibleRecords.map((record) => (
                          <tr key={record.id} className="border-t">
                            <td className="p-3">{record.recordType}</td>
                            <td className="p-3">{new Date(record.createdAt).toLocaleDateString()}</td>
                            <td className="p-3">{record.hospital.name}</td>
                            <td className="p-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadRecord(record.id, record.fileName)}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No accessible records yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
