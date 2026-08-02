"use client";

import { ShieldCheck, Clock3, Package, Bug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ScanResult } from "@/api/client";

interface DashboardHeaderProps {
  result: ScanResult;
}

export default function DashboardHeader({ result }: DashboardHeaderProps) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <ShieldCheck size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-bold">
                  Vulnerability Scan Report
                </h1>

                <p className="text-sm text-muted-foreground break-all">
                  {result.repo_url}
                </p>
              </div>
            </div>

            <Badge className="w-fit bg-green-600 hover:bg-green-600">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Scan Completed
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border p-4 text-center">
              <Clock3 className="mx-auto mb-2 h-5 w-5 text-blue-600" />
              <p className="text-xs text-muted-foreground">Duration</p>
              <h3 className="text-xl font-bold">{result.duration_seconds}s</h3>
            </div>

            <div className="rounded-xl border p-4 text-center">
              <Package className="mx-auto mb-2 h-5 w-5 text-orange-600" />
              <p className="text-xs text-muted-foreground">Dependencies</p>
              <h3 className="text-xl font-bold">{result.dependencies_scanned}</h3>
            </div>

            <div className="rounded-xl border p-4 text-center">
              <Bug className="mx-auto mb-2 h-5 w-5 text-red-600" />
              <p className="text-xs text-muted-foreground">Vulnerabilities</p>
              <h3 className="text-xl font-bold">{result.total_vulnerabilities}</h3>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}