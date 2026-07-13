"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  FileText,
  Bell,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  Hospital as HospitalIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { apiFetch, getApiUrl, getToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type MedicalRecord = {
  id: string;
  recordType: string;
  fileName: string;
  notes: string | null;
  createdAt: string;
  hospital: { id: string; name: string };
};

type ConsentRequest = {
  id: string;
  type: "upload" | "access";
  status: string;
  createdAt: string;
  hospital: { id: string; name: string };
  record?: {
    id: string;
    recordType: string;
    notes: string | null;
    fileName: string;
  } | null;
};

export default function PatientDashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [requests, setRequests] = useState<ConsentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recs, consents] = await Promise.all([
        apiFetch<MedicalRecord[]>("/api/records"),
        apiFetch<ConsentRequest[]>("/api/consent"),
      ]);
      setRecords(recs);
      setRequests(consents);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "patient")) {
      router.push("/login");
      return;
    }
    if (user?.role === "patient") loadData();
  }, [authLoading, user, router, loadData]);

  const handleConsent = async (requestId: string, decision: "approved" | "rejected") => {
    try {
      await apiFetch("/api/consent", {
        method: "PATCH",
        body: JSON.stringify({ requestId, status: decision }),
      });
      toast.success(decision === "approved" ? "Request approved" : "Request rejected");
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update request");
    }
  };

  const downloadRecord = async (recordId: string, fileName: string) => {
    const token = getToken();
    const res = await fetch(`${getApiUrl()}/api/files/${recordId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      toast.error("Download failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (authLoading || loading || !user) {
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
          <div className="text-white">
            <h1 className="text-xl font-bold">Patient Dashboard</h1>
            <p className="text-cyan-100 text-sm">
              {user.name} · Health ID: {user.healthId}
            </p>
          </div>
          <Button
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/30"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="records">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/90">
            <TabsTrigger value="records">My Medical Records</TabsTrigger>
            <TabsTrigger value="consent" className="relative">
              Consent Requests
              {requests.length > 0 && (
                <Badge className="ml-2 bg-red-500">{requests.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle>My Medical Records</CardTitle>
                <CardDescription>View and download your approved medical records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {records.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>No approved medical records yet</p>
                  </div>
                ) : (
                  records.map((record) => (
                    <div
                      key={record.id}
                      className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-cyan-700" />
                          <span className="font-semibold">{record.recordType}</span>
                          <Badge className="text-green-700 border-green-300 bg-green-50 border">
                            Approved
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <HospitalIcon className="w-3 h-3" />
                          {record.hospital.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </p>
                        {record.notes && <p className="text-sm mt-1">{record.notes}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadRecord(record.id, record.fileName)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consent">
            <Card>
              <CardHeader>
                <CardTitle>Pending Consent Requests</CardTitle>
                <CardDescription>
                  Approve or reject requests from healthcare providers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {requests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>No pending requests</p>
                  </div>
                ) : (
                  requests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <Badge className="mb-2">
                            {request.type === "upload" ? "Upload Request" : "Access Request"}
                          </Badge>
                          <p className="font-semibold">{request.hospital.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                          {request.type === "upload" && request.record && (
                            <p className="text-sm mt-2">
                              Record: {request.record.recordType}
                              {request.record.notes && ` — ${request.record.notes}`}
                            </p>
                          )}
                        </div>
                        <Badge className="text-amber-700 border-amber-300 bg-amber-50 border">
                          Pending
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleConsent(request.id, "rejected")}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleConsent(request.id, "approved")}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
