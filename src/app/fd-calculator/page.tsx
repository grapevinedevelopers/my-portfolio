// src/app/fd-calculator/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Info,
  Calendar,
  HelpCircle,
  RefreshCw,
  Coins,
  Sliders,
  Percent,
  CalendarCheck2,
  AlertCircle,
  Trash2,
  Plus
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

// Import Recharts components with SSR safety in mind
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot
} from "recharts";

// Excel preset values
const EXCEL_PRESETS = {
  principal: 3015916,
  originalRoi: 8.2,
  issueDate: "2026-01-30",
  breakDate: "2026-07-30",
  maturityDate: "2027-04-25",
  elapsedRoi: 7.0,
  penalty: 0.5,
  newRoi: 8.45,
};

export interface Slab {
  id: string;
  minDays: string;
  maxDays: string;
  rate: string;
}

const DEFAULT_SLABS: Slab[] = [
  { id: "slab1", minDays: "7", maxDays: "45", rate: "3.05" },
  { id: "slab2", minDays: "46", maxDays: "179", rate: "4.90" },
  { id: "slab3", minDays: "180", maxDays: "210", rate: "5.65" },
  { id: "slab4", minDays: "211", maxDays: "364", rate: "5.90" },
  { id: "slab5", minDays: "365", maxDays: "729", rate: "6.25" },
  { id: "slab6", minDays: "730", maxDays: "1094", rate: "6.40" },
  { id: "slab7", minDays: "1095", maxDays: "1824", rate: "6.30" },
  { id: "slab8", minDays: "1825", maxDays: "3650", rate: "6.05" },
];

export default function FDCalculatorPage() {
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- EXACT DATES MODE STATE (Stored as strings for seamless typing) ---
  const [principal, setPrincipal] = useState<string>("100000");
  const [originalRoi, setOriginalRoi] = useState<string>(String(EXCEL_PRESETS.originalRoi));
  const [issueDate, setIssueDate] = useState<string>("2026-01-01");
  const [breakDate, setBreakDate] = useState<string>("2026-06-20"); // Defaults to today's template date or real today
  const [durationValue, setDurationValue] = useState<string>("450");
  const [durationUnit, setDurationUnit] = useState<string>("days");
  const [elapsedRoi, setElapsedRoi] = useState<string>(String(EXCEL_PRESETS.elapsedRoi));
  const [applyPenalty, setApplyPenalty] = useState<boolean>(true);
  const [penalty, setPenalty] = useState<string>(String(EXCEL_PRESETS.penalty));
  const [newRoi, setNewRoi] = useState<string>(String(EXCEL_PRESETS.newRoi));

  // --- OPTIONAL DYNAMIC RATE SLABS STATE ---
  const [useSlabRates, setUseSlabRates] = useState<boolean>(true);
  const [slabs, setSlabs] = useState<Slab[]>(DEFAULT_SLABS);

  const getLookupRate = (days: number) => {
    if (slabs.length === 0) return 0;
    
    // Parse and sort slabs by minDays
    const sortedSlabs = [...slabs]
      .map(s => ({
        min: parseInt(s.minDays) || 0,
        max: parseInt(s.maxDays) || 0,
        rate: parseFloat(s.rate) || 0
      }))
      .sort((a, b) => a.min - b.min);

    const absoluteMin = sortedSlabs[0].min;
    if (days < absoluteMin) return 0;

    const matchedSlab = sortedSlabs.find(
      (slab) => days >= slab.min && days <= slab.max
    );
    if (matchedSlab) {
      return matchedSlab.rate;
    }

    // Fallback: if days is greater than the highest maxDays, return the rate of the highest slab
    const highestSlab = sortedSlabs[sortedSlabs.length - 1];
    if (days > highestSlab.max) {
      return highestSlab.rate;
    }
    return 0;
  };

  // Get current date string in YYYY-MM-DD
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    setBreakDate(todayStr);
  }, []);

  // --- PRESETS LOADER ---
  const loadPreset = () => {
    setPrincipal(String(EXCEL_PRESETS.principal));
    setOriginalRoi(String(EXCEL_PRESETS.originalRoi));
    setIssueDate(EXCEL_PRESETS.issueDate);
    setBreakDate(EXCEL_PRESETS.breakDate);
    setDurationValue("450");
    setDurationUnit("days");
    setElapsedRoi(String(EXCEL_PRESETS.elapsedRoi));
    setApplyPenalty(true);
    setPenalty(String(EXCEL_PRESETS.penalty));
    setNewRoi(String(EXCEL_PRESETS.newRoi));
    setUseSlabRates(false); // Excel presets use manual constant 7.0%
    setSlabs(DEFAULT_SLABS);
  };

  // --- MATH ENGINE & DYNAMIC CALCULATIONS ---
  const results = useMemo(() => {
    let p = 0;
    let rOrig = 0;
    let rNew = 0;
    let rElapsed = 0;
    let pen = 0;
    let isPenaltyActive = false;

    let dElapsed = 0;
    let dRemaining = 0;
    let dTotal = 0;
    let daysToToday = 0;

    let calcMaturityDateStr = "";
    const dIssue = new Date(issueDate.replace(/-/g, "/"));

    // 1. Gather inputs (Parsing strings safely to numbers)
    p = Number(principal) || 0;
    rOrig = Number(originalRoi) || 0;
    rNew = Number(newRoi) || 0;
    rElapsed = Number(elapsedRoi) || 0;
    pen = Number(penalty) || 0;
    isPenaltyActive = applyPenalty;

    const dBreak = new Date(breakDate.replace(/-/g, "/"));
    let dMaturity = new Date(dIssue);

    if (!isNaN(dIssue.getTime())) {
      const durVal = Number(durationValue) || 0;
      if (durationUnit === "days") {
        dMaturity.setDate(dMaturity.getDate() + durVal);
      } else if (durationUnit === "months") {
        dMaturity.setMonth(dMaturity.getMonth() + durVal);
      } else if (durationUnit === "years") {
        dMaturity.setFullYear(dMaturity.getFullYear() + durVal);
      }
      calcMaturityDateStr = dMaturity.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }

    if (!isNaN(dIssue.getTime()) && !isNaN(dBreak.getTime()) && !isNaN(dMaturity.getTime())) {
      dElapsed = Math.round((dBreak.getTime() - dIssue.getTime()) / (1000 * 60 * 60 * 24));
      dRemaining = Math.round((dMaturity.getTime() - dBreak.getTime()) / (1000 * 60 * 60 * 24));
      dTotal = Math.round((dMaturity.getTime() - dIssue.getTime()) / (1000 * 60 * 60 * 24));

      const dToday = new Date();
      dToday.setHours(0, 0, 0, 0);
      const dIssueMidnight = new Date(dIssue);
      dIssueMidnight.setHours(0, 0, 0, 0);
      daysToToday = Math.round((dToday.getTime() - dIssueMidnight.getTime()) / (1000 * 60 * 60 * 24));
    }

    // 2. Compute effective ROI for the elapsed duration
    if (useSlabRates) {
      rElapsed = getLookupRate(dElapsed);
    }
    const effectiveElapsedRoi = isPenaltyActive ? Math.max(0, rElapsed - pen) : rElapsed;

    // 3. Compute Baseline: Scenario A (Hold to Maturity)
    const qTotal = dTotal * 4 / 365;
    const maturityValueA = p * Math.pow(1 + rOrig / 400, qTotal);
    const interestA = maturityValueA - p;
    const accumulatedInterestA = p * Math.pow(1 + rOrig / 400, (dElapsed * 4 / 365)) - p;

    // 4. Compute Scenario B: Break & Reinvest Today
    const qElapsed = dElapsed * 4 / 365;
    const qRemaining = dRemaining * 4 / 365;

    const breakValue = p * Math.pow(1 + effectiveElapsedRoi / 400, qElapsed);
    const interestEarnedOnBreak = breakValue - p;
    const reinvestedValue = breakValue * Math.pow(1 + rNew / 400, qRemaining);
    const netBenefit = reinvestedValue - maturityValueA;
    const interestRemaining = reinvestedValue - breakValue;

    // 5. Calculate Exact Analytical Break-Even Point
    const x = 1 + rOrig / 400;
    const y = 1 + rNew / 400;
    const z = 1 + effectiveElapsedRoi / 400;

    let breakEvenTimeVal = 0; // Days
    let breakEvenDateStr = "";
    let isReinvestEverProfitable = false;

    if (y > x && y > z) {
      isReinvestEverProfitable = true;
      const lnYX = Math.log(y / x);
      const lnYZ = Math.log(y / z);
      if (lnYZ > 0) {
        const ratio = lnYX / lnYZ;
        breakEvenTimeVal = Math.round(dTotal * ratio);
        if (!isNaN(dIssue.getTime())) {
          const tempDate = new Date(dIssue);
          tempDate.setDate(tempDate.getDate() + breakEvenTimeVal);
          breakEvenDateStr = tempDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
          });
        }
      }
    }

    // 6. Generate Chart Data
    const chartData = [];
    const stepsCount = 40;
    
    // Dynamically collect boundary transition days from slabs
    const boundaryDays: number[] = [0];
    if (useSlabRates) {
      slabs.forEach((slab) => {
        const minVal = parseInt(slab.minDays) || 0;
        const maxVal = parseInt(slab.maxDays) || 0;
        // We want the exact boundary days to be plotted so the graph transitions sharply
        boundaryDays.push(minVal - 1);
        boundaryDays.push(minVal);
        boundaryDays.push(maxVal);
        boundaryDays.push(maxVal + 1);
      });
    }
    
    // Create a unique set of days to plot (combining standard steps and slab boundaries)
    const daysToPlotSet = new Set<number>();
    for (let i = 0; i <= stepsCount; i++) {
      daysToPlotSet.add(Math.round((dTotal * i) / stepsCount));
    }
    
    // Inject the boundaries if they fall within the actual FD duration
    boundaryDays.forEach((day) => {
      if (day >= 0 && day <= dTotal) {
        daysToPlotSet.add(day);
      }
    });

    // Inject the current elapsed days (break date) so it is guaranteed to be a plotted point
    if (dElapsed >= 0 && dElapsed <= dTotal) {
      daysToPlotSet.add(dElapsed);
    }

    // Inject the actual today's elapsed days so it is guaranteed to be a plotted point
    if (daysToToday >= 0 && daysToToday <= dTotal) {
      daysToPlotSet.add(daysToToday);
    }
    
    const sortedDays = Array.from(daysToPlotSet).sort((a, b) => a - b);
    
    for (const stepVal of sortedDays) {
      const qStepEl = stepVal * 4 / 365;
      const qStepRem = (dTotal - stepVal) * 4 / 365;

      const stepElapsedRoi = useSlabRates ? getLookupRate(stepVal) : rElapsed;
      const stepEffectiveElapsedRoi = isPenaltyActive ? Math.max(0, stepElapsedRoi - pen) : stepElapsedRoi;

      const stepBreakVal = p * Math.pow(1 + stepEffectiveElapsedRoi / 400, qStepEl);
      const stepReVal = stepBreakVal * Math.pow(1 + rNew / 400, qStepRem);
      const stepBenefit = stepReVal - maturityValueA;

      const interestFD1 = stepBreakVal - p;
      const interestFD2 = stepReVal - stepBreakVal;
      const totalInterest = stepReVal - p;

      const temp = new Date(dIssue);
      temp.setDate(temp.getDate() + stepVal);
      const label = temp.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const fullDateStr = temp.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      const durationFD1Text = `${stepVal} Days`;
      const durationFD2Text = `${dTotal - stepVal} Days`;

      chartData.push({
        step: stepVal,
        label,
        fullDateStr,
        benefit: Math.round(stepBenefit),
        reinvestValue: Math.round(stepReVal),
        breakValue: Math.round(stepBreakVal),
        interestFD1: Math.round(interestFD1),
        interestFD2: Math.round(interestFD2),
        totalInterest: Math.round(totalInterest),
        roiFD1: stepEffectiveElapsedRoi,
        roiFD2: rNew,
        durationFD1Text,
        durationFD2Text
      });
    }

    // Find min and max for chart formatting
    const benefits = chartData.map(d => d.benefit);
    const maxBenefit = Math.max(...benefits, 0);
    const minBenefit = Math.min(...benefits, 0);

    // Calculate color gradient offset (Recharts linearGradient split)
    let gradientOffset = 0.5;
    if (maxBenefit - minBenefit > 0) {
      gradientOffset = maxBenefit / (maxBenefit - minBenefit);
    }

    return {
      principal: p,
      originalRoi: rOrig,
      newRoi: rNew,
      elapsedRoi: effectiveElapsedRoi,
      daysElapsed: dElapsed,
      daysRemaining: dRemaining,
      daysTotal: dTotal,
      daysToToday,
      maturityValueA,
      interestA,
      accumulatedInterestA,
      breakValue,
      interestEarnedOnBreak,
      interestRemaining,
      reinvestedValue,
      netBenefit,
      calcMaturityDateStr,
      breakEvenTimeVal,
      breakEvenDateStr,
      isReinvestEverProfitable,
      chartData,
      gradientOffset
    };
  }, [
    principal,
    originalRoi,
    issueDate,
    breakDate,
    durationValue,
    durationUnit,
    elapsedRoi,
    applyPenalty,
    penalty,
    newRoi,
    useSlabRates,
    slabs
  ]);

  const cleanNumericInput = (val: string) => {
    // Remove any character that isn't a digit or dot
    let cleaned = val.replace(/[^0-9.]/g, "");

    // Ensure only one dot exists
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }

    // Remove leading zeros if followed by a digit (e.g. "05" -> "5", "00" -> "0")
    // Keep "0." or a single "0" intact
    return cleaned.replace(/^0+(?=\d)/, "");
  };

  const cleanIntegerInput = (val: string) => {
    return val.replace(/[^0-9]/g, "");
  };

  const updateSlab = (id: string, field: keyof Slab, value: string) => {
    setSlabs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const addSlab = () => {
    const newId = `slab_${Date.now()}`;
    const maxDayVals = slabs
      .map(s => parseInt(s.maxDays))
      .filter(val => !isNaN(val));
    const highestMax = maxDayVals.length > 0 ? Math.max(...maxDayVals) : 0;
    
    const newSlab: Slab = {
      id: newId,
      minDays: String(highestMax + 1),
      maxDays: String(highestMax + 30),
      rate: "6.00",
    };
    
    setSlabs((prev) => [...prev, newSlab]);
  };

  const deleteSlab = (id: string) => {
    if (slabs.length <= 1) return;
    setSlabs((prev) => prev.filter((s) => s.id !== id));
  };

  const resetSlabs = () => {
    setSlabs(DEFAULT_SLABS);
  };

  const formatSlabRangePreview = (minStr: string, maxStr: string) => {
    const min = parseInt(minStr);
    const max = parseInt(maxStr);
    if (isNaN(min) || isNaN(max)) return "Incomplete range";
    if (min > max) return "Invalid range (Min > Max)";
    
    if (min >= 365) {
      const minYears = (min / 365).toFixed(1).replace(/\.0$/, "");
      const maxYears = (max / 365).toFixed(1).replace(/\.0$/, "");
      return `${min} - ${max} days (~${minYears}-${maxYears} yrs)`;
    }
    return `${min} - ${max} days`;
  };

  const slabValidation = useMemo(() => {
    if (!useSlabRates) return { isValid: true, warnings: [] };
    const warnings: string[] = [];

    const parsedSlabs = slabs
      .map((s, idx) => ({
        index: idx,
        min: parseInt(s.minDays),
        max: parseInt(s.maxDays),
        rate: parseFloat(s.rate)
      }))
      .filter((s) => !isNaN(s.min) && !isNaN(s.max));

    parsedSlabs.sort((a, b) => a.min - b.min);

    for (let i = 0; i < parsedSlabs.length; i++) {
      const current = parsedSlabs[i];
      
      if (current.min > current.max) {
        warnings.push(
          `Slab ${current.index + 1} (${current.min} to ${current.max} days) has Min Days greater than Max Days.`
        );
      }
      
      if (i > 0) {
        const prev = parsedSlabs[i - 1];
        if (current.min <= prev.max) {
          warnings.push(
            `Overlap: Slab ${current.index + 1} starting at ${current.min} days overlaps with Slab ${prev.index + 1} ending at ${prev.max} days.`
          );
        } else if (current.min > prev.max + 1) {
          warnings.push(
            `Gap: There is an un-covered gap between ${prev.max} days and ${current.min} days.`
          );
        }
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }, [slabs, useSlabRates]);

  const formatRupee = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Helper styles based on benefit
  const getBannerStyles = (benefit: number) => {
    if (benefit > 0) {
      return {
        bg: "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10",
        border: "border-l-4 border-l-emerald-500",
        text: "text-emerald-600 dark:text-emerald-400",
        badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
      };
    }
    return {
      bg: "border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/10",
      border: "border-l-4 border-l-rose-500",
      text: "text-rose-600 dark:text-rose-400",
      badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
    };
  };

  const bannerStyle = getBannerStyles(results.netBenefit);
  const xAxisLabel = "Break Date (FD Timeline)";

  return (
    <div className="w-full py-10 md:py-16 bg-gradient-to-b from-background via-indigo-50/10 dark:via-indigo-950/5 to-background min-h-screen">
      <div className="container mx-auto max-w-screen-xl px-4 md:px-6">

        {/* Intro Header */}
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold">
            <Coins className="w-4 h-4" />
            FD Decision Optimizer
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Fixed Deposit Premature Break Calculator
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed text-base md:text-base">
            Should you break your existing FD to reinvest at a higher interest rate? Fill in your deposit parameters below to visualize the profitability curve.
          </p>
        </div>

        {/* Outer container & Preset Button */}
        <div className="w-full max-w-5xl mx-auto space-y-6">
          <TooltipProvider delayDuration={200}>
            {/* ========================================== */}
            {/* INPUTS CONTAINER (TOP PANEL)               */}
            {/* ========================================== */}
            <Card className="shadow-md border border-border/80 backdrop-blur-sm bg-card/60 mb-8">
              <CardHeader className="bg-muted/30 pb-3 border-b">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Sliders className="w-4 h-4 text-primary" />
                  FD Configuration Parameters
                </CardTitle>
                <CardDescription className="text-[13px]">
                  Fill in your current Fixed Deposit details, premature break information, and the new reinvestment rate.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* Col 1: Original FD Setup */}
                  <div className="space-y-4 p-4 rounded-xl bg-muted/20 border">
                    <div className="border-b pb-1.5 mb-1 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[12px] flex items-center justify-center font-bold">1</span>
                        Original FD Setup
                      </h4>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="e-principal" className="text-[13px] font-semibold flex items-center gap-1">
                          Principal (₹)
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent>Original sum of money deposited in the Fixed Deposit</TooltipContent>
                          </Tooltip>
                        </Label>
                        <span className="text-primary font-mono text-sm font-bold">{formatRupee(Number(principal) || 0)}</span>
                      </div>
                      <Slider
                        min={10000}
                        max={10000000}
                        step={10000}
                        value={[Number(principal) || 0]}
                        onValueChange={(val) => setPrincipal(String(val[0]))}
                      />
                      <Input
                        id="e-principal"
                        type="text"
                        value={principal}
                        onChange={(e) => setPrincipal(cleanNumericInput(e.target.value))}
                        className="h-8 font-mono text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="e-orig-roi" className="text-[13px] font-semibold flex items-center gap-1">
                          Original ROI (%)
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent>The annual interest rate (ROI) of your active FD certificate</TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          id="e-orig-roi"
                          type="text"
                          value={originalRoi}
                          onChange={(e) => setOriginalRoi(cleanNumericInput(e.target.value))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="e-issue" className="text-[13px] font-semibold flex items-center gap-1">
                          Issue Date
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent>The start date of the Fixed Deposit</TooltipContent>
                          </Tooltip>
                        </Label>
                        <input
                          id="e-issue"
                          type="date"
                          value={issueDate}
                          onChange={(e) => setIssueDate(e.target.value)}
                          className="w-full bg-background border rounded-md px-1.5 py-1 text-sm outline-none h-8 font-medium cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[13px] font-semibold flex items-center gap-1">
                        Original Duration
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3 h-3 text-muted-foreground cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent>The original duration/lifetime of the Fixed Deposit (used to calculate Maturity Date)</TooltipContent>
                        </Tooltip>
                      </Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <Input
                          type="text"
                          value={durationValue}
                          onChange={(e) => setDurationValue(cleanNumericInput(e.target.value))}
                          className="col-span-2 h-8 text-sm"
                        />
                        <select
                          value={durationUnit}
                          onChange={(e) => setDurationUnit(e.target.value)}
                          className="bg-background border rounded-md px-1 py-1 text-sm outline-none h-8 font-medium cursor-pointer"
                        >
                          <option value="days">Days</option>
                          <option value="months">Months</option>
                          <option value="years">Years</option>
                        </select>
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                        <CalendarCheck2 className="w-3 h-3 text-primary shrink-0" />
                        Maturity: <span className="font-semibold text-foreground font-mono">{results.calcMaturityDateStr}</span>
                      </p>
                    </div>
                  </div>

                  {/* Col 2: Premature Break Conditions */}
                  <div className="space-y-4 p-4 rounded-xl bg-muted/20 border">
                    <div className="border-b pb-1.5 mb-1 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[12px] flex items-center justify-center font-bold">2</span>
                        Premature Break
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="e-break" className="text-[13px] font-semibold flex items-center gap-1">
                          Break Date
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent>The date you plan to prematurely close/break this FD</TooltipContent>
                          </Tooltip>
                        </Label>
                        <input
                          id="e-break"
                          type="date"
                          value={breakDate}
                          onChange={(e) => setBreakDate(e.target.value)}
                          className="w-full bg-background border rounded-md px-1.5 py-1 text-sm outline-none h-8 font-medium cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[13px] font-semibold text-muted-foreground">Elapsed Days</Label>
                        <div className="h-8 flex items-center px-2 bg-muted/60 rounded-md border text-sm font-mono font-bold text-foreground">
                          {results.daysElapsed} Days
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="e-elapsed" className="text-[13px] font-semibold flex items-center justify-between gap-1 w-full">
                        <span className="flex items-center gap-1">
                          Elapsed ROI (%)
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent>The standard interest rate the bank offers for the period your money actually stayed in the deposit (usually lower than your original ROI)</TooltipContent>
                          </Tooltip>
                        </span>
                        {useSlabRates ? (
                          <span className="text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">Slab Auto</span>
                        ) : (
                          <span className="text-[11px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-bold">Manual</span>
                        )}
                      </Label>
                      <Input
                        id="e-elapsed"
                        type="text"
                        value={useSlabRates ? getLookupRate(results.daysElapsed).toFixed(2) : elapsedRoi}
                        onChange={(e) => setElapsedRoi(cleanNumericInput(e.target.value))}
                        disabled={useSlabRates}
                        className={`h-8 text-sm font-mono ${useSlabRates ? "bg-muted/80 font-semibold cursor-not-allowed text-muted-foreground" : ""}`}
                      />
                      {useSlabRates && (
                        <p className="text-[11px] text-muted-foreground flex items-start gap-1 pt-0.5">
                          <Info className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                          <span>Auto-calculated from slab rates. Edit the <span className="font-semibold text-foreground">Rate Slabs table</span> below to change this.</span>
                        </p>
                      )}
                    </div>

                    <div className="p-2.5 bg-background rounded border space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="e-apply-penalty" className="text-[13px] font-bold">
                          Premature Penalty
                        </Label>
                        <Switch
                          id="e-apply-penalty"
                          checked={applyPenalty}
                          onCheckedChange={setApplyPenalty}
                          className="scale-90"
                        />
                      </div>
                      {applyPenalty && (
                        <div className="space-y-1">
                          <Label htmlFor="e-penalty" className="text-[13px] font-semibold flex items-center gap-1">
                            Penalty Fee (%)
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-muted-foreground cursor-pointer" />
                              </TooltipTrigger>
                              <TooltipContent>Rate deducted by the bank for premature withdrawal (usually 0.5% or 1%)</TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            id="e-penalty"
                            type="text"
                            value={penalty}
                            onChange={(e) => setPenalty(cleanNumericInput(e.target.value))}
                            className="h-8 text-sm font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Col 3: Reinvestment Option */}
                  <div className="space-y-4 p-4 rounded-xl bg-muted/20 border flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="border-b pb-1.5 mb-1 flex items-center justify-between">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[12px] flex items-center justify-center font-bold">3</span>
                          New Reinvestment ROI
                        </h4>
                      </div>

                      <div className="space-y-2 pt-2">
                        <Label htmlFor="e-new-roi" className="text-[13px] font-semibold flex items-center gap-1">
                          New Reinvestment ROI (%)
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent>The annual interest rate offered on FDs today</TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          id="e-new-roi"
                          type="text"
                          value={newRoi}
                          onChange={(e) => setNewRoi(cleanNumericInput(e.target.value))}
                          className="h-9 font-semibold text-base"
                        />
                        <p className="text-[12px] text-muted-foreground leading-normal">
                          We will reinvest your premature payout in a new FD at this rate for the remaining duration.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 text-[12px] text-muted-foreground italic flex items-center gap-1.5 border-t">
                      <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                      Calculates days using actual calendar dates.
                    </div>
                  </div>

                </div>

              </CardContent>
            </Card>
          </TooltipProvider>

          {/* Collapsible Slabs Configuration Card */}
          <Card className="shadow-sm border border-border/80 backdrop-blur-sm bg-card/60 mb-6">
            <details className="group">
              <summary className="flex justify-between items-center p-4 cursor-pointer select-none font-bold text-base text-foreground">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-primary" />
                  Interest Rate Slabs Configuration (Optional)
                </div>
                <div className="flex items-center gap-2 font-medium">
                  {useSlabRates ? (
                    <span className="text-[12px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">Active</span>
                  ) : (
                    <span className="text-[12px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-semibold">Disabled</span>
                  )}
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform duration-200">
                    ▼
                  </span>
                </div>
              </summary>
              <div className="p-4 pt-0 border-t bg-muted/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-b pb-3">
                  <div className="space-y-1">
                    <Label htmlFor="slab-lookup-toggle" className="text-sm font-bold">
                      Enable Slab-based Rate Lookup
                    </Label>
                    <p className="text-[13px] text-muted-foreground">
                      Automatically lookup Elapsed ROI based on how many days the FD was active.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="slab-lookup-toggle"
                      checked={useSlabRates}
                      onCheckedChange={setUseSlabRates}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center flex-wrap gap-3">
                    <Label className="text-sm font-bold text-foreground">Custom Tenor Slabs (General Public Rates)</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addSlab}
                        disabled={!useSlabRates}
                        className="h-7 text-[12px] flex items-center gap-1 hover:bg-muted"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Slab
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetSlabs}
                        className="h-7 text-[12px] text-primary hover:bg-primary/10 border"
                      >
                        Reset Slabs to SBI Defaults
                      </Button>
                    </div>
                  </div>

                  {slabValidation.warnings.length > 0 && (
                    <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                        Slab Configuration Warnings
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5 text-[13px] font-medium">
                        {slabValidation.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-lg border bg-background">
                    <table className="w-full border-collapse text-left min-w-[500px]">
                      <thead>
                        <tr className="border-b bg-muted/50 text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                          <th className="py-2.5 px-3">Min Days</th>
                          <th className="py-2.5 px-3">Max Days</th>
                          <th className="py-2.5 px-3">Rate (%)</th>
                          <th className="py-2.5 px-3 hidden sm:table-cell">Preview Range</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-sm">
                        {slabs.map((slab) => (
                          <tr key={slab.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-3 w-32">
                              <Input
                                type="text"
                                value={slab.minDays}
                                onChange={(e) => updateSlab(slab.id, "minDays", cleanIntegerInput(e.target.value))}
                                disabled={!useSlabRates}
                                className="h-8 font-mono text-sm w-full"
                                placeholder="e.g. 7"
                              />
                            </td>
                            <td className="py-2 px-3 w-32">
                              <Input
                                type="text"
                                value={slab.maxDays}
                                onChange={(e) => updateSlab(slab.id, "maxDays", cleanIntegerInput(e.target.value))}
                                disabled={!useSlabRates}
                                className="h-8 font-mono text-sm w-full"
                                placeholder="e.g. 45"
                              />
                            </td>
                            <td className="py-2 px-3 w-32">
                              <Input
                                type="text"
                                value={slab.rate}
                                onChange={(e) => updateSlab(slab.id, "rate", cleanNumericInput(e.target.value))}
                                disabled={!useSlabRates}
                                className="h-8 font-mono text-sm w-full"
                                placeholder="e.g. 3.05"
                              />
                            </td>
                            <td className="py-2 px-3 hidden sm:table-cell align-middle text-muted-foreground">
                              <span className="px-2 py-0.5 rounded bg-muted/60 font-medium text-[12px] font-mono">
                                {formatSlabRangePreview(slab.minDays, slab.maxDays)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteSlab(slab.id)}
                                disabled={!useSlabRates || slabs.length <= 1}
                                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 disabled:opacity-30"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Advisory Note: How to choose Elapsed ROI */}
                  <div className="flex gap-3 p-4 rounded-xl border border-amber-400/30 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-500/20">
                    <div className="shrink-0 mt-0.5">
                      <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="space-y-2 text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                      <p className="font-semibold text-amber-800 dark:text-amber-300">
                        📌 How to choose the Revised ROI for the Elapsed Period?
                      </p>
                      <p>
                        The <span className="font-bold">Elapsed ROI</span> must be chosen carefully as per your bank&apos;s rules.
                        It is generally the <span className="font-bold">lower of the two rates</span> applicable for the elapsed period, as on:
                      </p>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>
                          <span className="font-semibold">(I) Today</span> — the date you are breaking, extending, or taking the FD before maturity.
                        </li>
                        <li>
                          <span className="font-semibold">(II) Original FDR Date</span> — the date when the Fixed Deposit was originally created.
                        </li>
                      </ol>
                      <p className="text-[13px] text-amber-700 dark:text-amber-400 italic font-medium pt-1">
                        ✦ Touch the graph below for more information on how breaking at different points affects your returns.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </Card>


          {/* ========================================== */}
          {/* VISUAL SEPARATOR                           */}
          {/* ========================================== */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Analysis & Decision Recommendation
              </span>
            </div>
          </div>

          {/* ========================================== */}
          {/* OUTPUTS CONTAINER (BOTTOM PANEL)           */}
          {/* ========================================== */}
          <div className="space-y-6">

            {/* Dynamic Advisory Banner - Full Width */}
            <div className={`w-full p-6 rounded-2xl border shadow-lg flex flex-col sm:flex-row items-center gap-5 transition-all ${bannerStyle.bg} ${bannerStyle.border}`}>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${results.netBenefit > 0 ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40" : "bg-rose-100 text-rose-600 dark:bg-rose-950/40"
                }`}>
                {results.netBenefit > 0 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
              </div>

              <div className="space-y-1 flex-1 text-center sm:text-left">
                <span className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Advisory Outcome</span>
                <h3 className="text-lg font-extrabold text-foreground leading-tight">
                  {results.netBenefit > 0 ? "Recommended: Break & Reinvest!" : "Recommended: Keep Original FD"}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {results.netBenefit > 0
                    ? `Great news! Breaking your FD and reinvesting at ${results.newRoi}% puts an extra ${formatRupee(results.netBenefit)} in your pocket by maturity. It's worth making the switch.`
                    : `Breaking your FD right now isn't in your favour — you'd walk away with ${formatRupee(Math.abs(results.netBenefit))} less than if you simply held on till maturity. Sit tight and let your current FD run its course.`
                  }
                </p>
              </div>

              <div className={`px-4 py-2 rounded-xl text-center shrink-0 ${bannerStyle.badge}`}>
                <span className="block text-[11px] uppercase tracking-wider font-bold">{results.netBenefit >= 0 ? "Net Benefit" : "Net Loss"}</span>
                <span className="text-lg font-black font-mono">
                  {results.netBenefit >= 0 ? "+" : ""}{formatRupee(results.netBenefit)}
                </span>
              </div>
            </div>

            {/* Bottom Section: Side-by-Side Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* Option 1: Hold current FD */}
              <Card className="shadow-sm border border-l-4 border-l-primary">
                <CardHeader className="pb-1 pt-3.5 bg-muted/5 border-b">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Option 1: Hold Current FD to Maturity</CardTitle>
                  <CardDescription className="text-[12px] text-muted-foreground mt-0.5">
                    (If you do not break your FD and keep it as is)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm pt-4 pb-4">
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-muted-foreground">Final Maturity Date:</span>
                    <span className="font-semibold font-mono text-foreground">{results.calcMaturityDateStr}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-muted-foreground">Annual Interest Rate (ROI):</span>
                    <span className="font-semibold font-mono text-foreground">{results.originalRoi}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-muted-foreground">Total Interest Earned:</span>
                    <span className="font-semibold font-mono text-foreground">{formatRupee(results.interestA)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-muted-foreground font-bold">Maturity Payout Value:</span>
                    <span className="font-black text-primary font-mono text-base">{formatRupee(results.maturityValueA)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Option 2: Break & Reinvest */}
              <Card className={`shadow-sm border ${results.netBenefit > 0 ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-rose-500"}`}>
                <CardHeader className="pb-1 pt-3.5 bg-muted/5 border-b">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Option 2: Break & Reinvest Today</CardTitle>
                  <CardDescription className="text-[12px] text-muted-foreground mt-0.5">
                    (Close early, receive payout, and reinvest at the new rate)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm pt-4 pb-4">
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-muted-foreground font-medium">1st Period Interest (Elapsed):</span>
                    <span className="font-semibold font-mono text-foreground">{formatRupee(results.interestEarnedOnBreak)}</span>
                  </div>
                  <div className="text-[13px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-2.5 py-1.5 rounded-md border border-indigo-500/20 -mt-0.5 mb-2 leading-relaxed">
                    Earned over <span className="font-extrabold text-foreground font-mono">{results.daysElapsed} Days</span> at <span className="font-extrabold text-foreground font-mono">{results.elapsedRoi}%</span> net ROI
                  </div>

                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-muted-foreground font-medium">Payout Received on Break:</span>
                    <span className="font-semibold font-mono text-foreground">{formatRupee(results.breakValue)}</span>
                  </div>
                  <div className="text-[12px] text-muted-foreground -mt-1 mb-2 leading-normal italic pl-1">
                    Principal + 1st Period Interest (reinvested next)
                  </div>

                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-muted-foreground font-medium">2nd Period Interest (Reinvest):</span>
                    <span className="font-semibold font-mono text-foreground">{formatRupee(results.interestRemaining)}</span>
                  </div>
                  <div className="text-[13px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-2.5 py-1.5 rounded-md border border-indigo-500/20 -mt-0.5 mb-2 leading-relaxed">
                    Earned over <span className="font-extrabold text-foreground font-mono">{results.daysRemaining} Days</span> at <span className="font-extrabold text-foreground font-mono">{results.newRoi}%</span> ROI
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t mt-2">
                    <span className="text-muted-foreground font-bold">Final Reinvest Payout Value:</span>
                    <span className={`font-black font-mono text-base ${results.netBenefit > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {formatRupee(results.reinvestedValue)}
                    </span>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Break-Even Timeline Analysis Card - Full Width */}
            <Card className="shadow-md border border-border/80">
              <CardHeader className="pb-2 pt-4 bg-muted/20 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  Break-Even Threshold Window
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-sm">
                {results.isReinvestEverProfitable ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded bg-primary/5 border border-primary/20 max-w-xl">
                      <div>
                        <span className="block text-[8px] uppercase text-muted-foreground font-bold">Break-Even Point</span>
                        <span className="text-base font-black font-mono text-primary">
                          {results.breakEvenDateStr}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] uppercase text-muted-foreground font-bold">Profitable Window</span>
                        <span className="text-base font-semibold text-foreground font-mono">
                          {`< ${results.breakEvenTimeVal} Days`}
                        </span>
                      </div>
                    </div>

                    <p className="leading-relaxed text-[13px] text-muted-foreground font-medium">
                      Breaking on/before <strong>{results.breakEvenDateStr}</strong> yields a profit. Your proposed break date is <strong>{new Date(breakDate.replace(/-/g, "/")).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>, which is{" "}
                      <span className={results.daysElapsed < results.breakEvenTimeVal ? "text-emerald-500 font-extrabold" : "text-rose-500 font-extrabold"}>
                        {results.daysElapsed < results.breakEvenTimeVal ? "PROFITABLE" : "UNPROFITABLE"}
                      </span>.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 p-3 rounded bg-amber-500/5 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed text-[13px]">
                      <strong>Reinvesting is never profitable.</strong> Because the new rate ({results.newRoi}%) is too low relative to your current settings, early closure will always result in a net loss.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Graphical Curve Chart (Full Width) */}
            <Card className="shadow-md border border-border/80">
              <CardHeader className="pb-2 pt-4 bg-muted/10 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-bold">Net Benefit (₹) Curve Across FD Timeline</CardTitle>
                  <span className="text-[12px] text-muted-foreground italic">Green = Profit Zone | Red = Loss Zone</span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                {isMounted ? (
                  <div className="w-full h-[380px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={results.chartData}
                        margin={{ top: 10, right: 10, left: 30, bottom: 25 }}
                      >
                        <defs>
                          <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={results.gradientOffset} stopColor="#10b981" stopOpacity={0.25} />
                            <stop offset={results.gradientOffset} stopColor="#f43f5e" stopOpacity={0.25} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis
                          dataKey="step"
                          type="number"
                          domain={[0, results.daysTotal]}
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(step) => {
                            const d = results.chartData.find((p) => p.step === step);
                            return d ? d.label : `${step}d`;
                          }}
                          label={{
                            value: xAxisLabel,
                            position: "insideBottom",
                            offset: -12,
                            fontSize: 10,
                            fontWeight: "bold",
                            fill: "#64748b"
                          }}
                        />
                        <YAxis
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v / 1000}k`}
                          label={{
                            value: "Net Benefit / Loss (₹)",
                            angle: -90,
                            position: "insideLeft",
                            offset: -18,
                            fontSize: 10,
                            fontWeight: "bold",
                            fill: "#64748b"
                          }}
                        />
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background/95 border p-2.5 rounded-md shadow-md text-[12px] font-medium space-y-1.5 min-w-[200px]">
                                  <p className="font-bold text-foreground border-b pb-1 mb-1">{data.fullDateStr || `Day ${data.step}`}</p>
                                  <div className="space-y-0.5">
                                    <p className="text-muted-foreground flex justify-between gap-4">
                                      <span>Interest (FD1) @ {data.roiFD1}% for {data.durationFD1Text}:</span>
                                      <span className="font-mono text-foreground font-semibold">{formatRupee(data.interestFD1)}</span>
                                    </p>
                                    <p className="text-muted-foreground flex justify-between gap-4">
                                      <span>Interest (FD2) @ {data.roiFD2}% for {data.durationFD2Text}:</span>
                                      <span className="font-mono text-foreground font-semibold">{formatRupee(data.interestFD2)}</span>
                                    </p>
                                    <p className="text-muted-foreground flex justify-between gap-4 border-t pt-1 font-bold">
                                      <span>Total Interest:</span>
                                      <span className="font-mono text-foreground">{formatRupee(data.totalInterest)}</span>
                                    </p>
                                  </div>
                                  <div className="space-y-0.5 border-t pt-1.5">
                                    <p className="text-muted-foreground flex justify-between gap-4 font-semibold">
                                      <span>Amount at End:</span>
                                      <span className="font-mono text-primary font-bold">{formatRupee(data.reinvestValue)}</span>
                                    </p>
                                    <p className="flex justify-between gap-4 font-bold">
                                      <span>{data.benefit >= 0 ? "Net Benefit" : "Net Loss"}:</span>
                                      <span className={data.benefit >= 0 ? "text-emerald-500 font-mono" : "text-rose-500 font-mono"}>
                                        {data.benefit >= 0 ? "+" : ""}{formatRupee(data.benefit)}
                                      </span>
                                    </p>
                                    <p className="text-[8px] text-muted-foreground text-right italic -mt-0.5 leading-none">
                                      (Amount at End - Option 1 Maturity Payout)
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        {/* Y=0 Reference Line */}
                        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" opacity={0.6} />

                        {/* Break-Even Reference Line */}
                        {results.isReinvestEverProfitable && (
                          <ReferenceLine
                            x={results.breakEvenTimeVal}
                            stroke="#6366f1"
                            strokeDasharray="4 4"
                            label={{
                              value: "Break-Even",
                              position: "top",
                              fill: "#6366f1",
                              fontSize: 8,
                              fontWeight: "bold"
                            }}
                          />
                        )}

                        <Area
                          type="monotone"
                          dataKey="benefit"
                          stroke="#6366f1"
                          strokeWidth={2}
                          fill="url(#splitColor)"
                        />

                        {/* Current Break Date Dot */}
                        {(() => {
                          if (results.daysElapsed < 0 || results.daysElapsed > results.daysTotal) return null;
                          return (
                            <ReferenceDot
                              x={results.daysElapsed}
                              y={results.breakValue - results.principal}
                              r={8}
                              fill="#6366f1"
                              stroke="#ffffff"
                              strokeWidth={3}
                              ifOverflow="visible"
                              label={{
                                value: `Break Date (Day ${results.daysElapsed})`,
                                position: "top",
                                fill: "#6366f1",
                                fontSize: 10,
                                fontWeight: "bold",
                                offset: 12
                              }}
                            />
                          );
                        })()}

                        {/* Actual Today Dot — only when today ≠ break date */}
                        {(() => {
                          if (
                            results.daysToToday < 0 ||
                            results.daysToToday > results.daysTotal ||
                            results.daysToToday === results.daysElapsed
                          ) return null;
                          const todayChartPoint = results.chartData.find((d) => d.step === results.daysToToday);
                          const todayBenefit = todayChartPoint?.benefit ?? 0;
                          return (
                            <ReferenceDot
                              x={results.daysToToday}
                              y={todayBenefit}
                              r={8}
                              fill="#10b981"
                              stroke="#ffffff"
                              strokeWidth={3}
                              ifOverflow="visible"
                              label={{
                                value: `Today (Day ${results.daysToToday})`,
                                position: "bottom",
                                fill: "#10b981",
                                fontSize: 10,
                                fontWeight: "bold",
                                offset: 12
                              }}
                            />
                          );
                        })()}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="w-full h-[380px] bg-muted animate-pulse rounded-md flex items-center justify-center text-sm text-muted-foreground">
                    Loading chart...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mathematical Note */}
            <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-indigo-800 dark:text-indigo-300 text-sm flex gap-2.5 shadow-sm leading-relaxed">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Quarterly Compounding Math:</strong> Calculations use the quarterly compounding formula:
                <div className="font-mono text-[12px] mt-1 bg-background/50 p-1.5 rounded border border-indigo-500/10">
                  A = P * (1 + R / 400)^Q
                </div>
                where <span className="font-bold">Q = Days * 4 / 365</span>. Breaking the FD prematurely recalculates interest earned so far at the effective elapsed rate (standard elapsed rate minus penalty if applied), which is then reinvested at the new rate for the remaining duration.
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
