"use client";

import { motion } from "framer-motion";
import {
  ShieldAlert,
  AlertTriangle,
  Shield,
  ShieldCheck,
} from "lucide-react";

import type { ScanResult } from "@/api/client";

interface Props {
  result: ScanResult;
}

const metrics = [
  {
    title: "Critical",
    key: "critical",
    color: "bg-red-500",
    icon: ShieldAlert,
  },
  {
    title: "High",
    key: "high",
    color: "bg-orange-500",
    icon: AlertTriangle,
  },
  {
    title: "Medium",
    key: "medium",
    color: "bg-yellow-500",
    icon: Shield,
  },
  {
    title: "Low",
    key: "low",
    color: "bg-green-500",
    icon: ShieldCheck,
  },
];

export default function VulnMetricCards({
  result,
}: Props) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">

      {metrics.map((item, index) => {

        const Icon = item.icon;

        const value =
          result.summary[
            item.key as keyof typeof result.summary
          ];

        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.35,
              delay: index * 0.08,
            }}
            whileHover={{
              y: -5,
              scale: 1.02,
            }}
            className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm hover:shadow-xl transition-all"
          >
            <div className="p-6">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-sm text-muted-foreground">
                    {item.title}
                  </p>

                  <h2 className="mt-3 text-4xl font-bold">
                    {value}
                  </h2>

                </div>

                <div
                  className={`${item.color} h-14 w-14 rounded-xl flex items-center justify-center text-white`}
                >
                  <Icon size={28} />
                </div>

              </div>

            </div>
          </motion.div>
        );

      })}
    </div>
  );
}