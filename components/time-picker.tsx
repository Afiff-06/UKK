"use client";

import { useState, useRef, useEffect } from "react";
import { Clock, X } from "lucide-react";

interface TimePickerProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    minHour?: number;
    maxHour?: number;
}

const ALLOWED_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15];
const MINUTES = [0, 15, 30, 45];

export default function TimePicker({
    value,
    onChange,
    label,
    minHour = 7,
    maxHour = 15,
}: TimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedHour, setSelectedHour] = useState<number | null>(null);
    const [step, setStep] = useState<"hour" | "minute">("hour");
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse current value
    const [displayHour, displayMinute] = value
        ? value.split(":").map(Number)
        : [8, 0];

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
                setStep("hour");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleHourSelect = (hour: number) => {
        setSelectedHour(hour);
        setStep("minute");
    };

    const handleMinuteSelect = (minute: number) => {
        const h = selectedHour ?? displayHour;
        const newTime = `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        onChange(newTime);
        setIsOpen(false);
        setStep("hour");
    };

    const filteredHours = ALLOWED_HOURS.filter(
        (h) => h >= minHour && h <= maxHour
    );

    // Calculate clock hand angle
    const hourAngle = ((displayHour % 12) / 12) * 360 - 90;
    const minuteAngle = (displayMinute / 60) * 360 - 90;

    return (
        <div className="relative" ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">
                    {label}
                </label>
            )}
            <div
                onClick={() => {
                    setIsOpen(!isOpen);
                    setStep("hour");
                }}
                className="w-full border rounded-xl px-4 py-3 bg-white flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Clock
                            size={16}
                            className="text-blue-500"
                        />
                    </div>
                    <span className="font-medium text-gray-800 text-lg tracking-wide">
                        {String(displayHour).padStart(2, "0")}:
                        {String(displayMinute).padStart(2, "0")}
                    </span>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    07:00 – 15:00
                </span>
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 w-[320px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium opacity-80 uppercase tracking-wider">
                                Pilih Waktu
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    setStep("hour");
                                }}
                                className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </div>
                        <div className="flex items-center gap-1 text-3xl font-bold">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setStep("hour");
                                }}
                                className={`px-2 py-1 rounded-lg transition-colors ${step === "hour" ? "bg-white/20" : "hover:bg-white/10"}`}
                            >
                                {String(selectedHour ?? displayHour).padStart(
                                    2,
                                    "0"
                                )}
                            </button>
                            <span>:</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setStep("minute");
                                }}
                                className={`px-2 py-1 rounded-lg transition-colors ${step === "minute" ? "bg-white/20" : "hover:bg-white/10"}`}
                            >
                                {String(displayMinute).padStart(2, "0")}
                            </button>
                        </div>
                    </div>

                    {/* Clock Face */}
                    <div className="p-5">
                        <div className="relative w-[240px] h-[240px] mx-auto">
                            {/* Clock circle */}
                            <div className="absolute inset-0 rounded-full bg-gray-50 border-2 border-gray-100">
                                {/* Center dot */}
                                <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-blue-600 rounded-full -translate-x-1/2 -translate-y-1/2 z-10" />

                                {/* Clock hand */}
                                <div
                                    className="absolute top-1/2 left-1/2 origin-left h-0.5 bg-blue-500 z-[5] transition-transform duration-300"
                                    style={{
                                        width: "80px",
                                        transform: `rotate(${step === "hour" ? hourAngle : minuteAngle}deg)`,
                                    }}
                                />

                                {step === "hour" ? (
                                    /* Hour numbers */
                                    filteredHours.map((hour, i) => {
                                        const totalHours = filteredHours.length;
                                        const angle =
                                            (i / totalHours) * 360 - 90;
                                        const radius = 90;
                                        const x =
                                            120 +
                                            radius *
                                                Math.cos(
                                                    (angle * Math.PI) / 180
                                                );
                                        const y =
                                            120 +
                                            radius *
                                                Math.sin(
                                                    (angle * Math.PI) / 180
                                                );
                                        const isSelected =
                                            hour ===
                                            (selectedHour ?? displayHour);

                                        return (
                                            <button
                                                key={hour}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleHourSelect(hour);
                                                }}
                                                className={`absolute w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 -translate-x-1/2 -translate-y-1/2 ${
                                                    isSelected
                                                        ? "bg-blue-600 text-white scale-110 shadow-lg shadow-blue-200"
                                                        : "text-gray-700 hover:bg-blue-100 hover:text-blue-700"
                                                }`}
                                                style={{
                                                    left: `${x}px`,
                                                    top: `${y}px`,
                                                }}
                                            >
                                                {String(hour).padStart(2, "0")}
                                            </button>
                                        );
                                    })
                                ) : (
                                    /* Minute numbers */
                                    MINUTES.map((minute, i) => {
                                        const angle = (i / 4) * 360 - 90;
                                        const radius = 90;
                                        const x =
                                            120 +
                                            radius *
                                                Math.cos(
                                                    (angle * Math.PI) / 180
                                                );
                                        const y =
                                            120 +
                                            radius *
                                                Math.sin(
                                                    (angle * Math.PI) / 180
                                                );
                                        const isSelected =
                                            minute === displayMinute;

                                        return (
                                            <button
                                                key={minute}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMinuteSelect(minute);
                                                }}
                                                className={`absolute w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 -translate-x-1/2 -translate-y-1/2 ${
                                                    isSelected
                                                        ? "bg-blue-600 text-white scale-110 shadow-lg shadow-blue-200"
                                                        : "text-gray-700 hover:bg-blue-100 hover:text-blue-700"
                                                }`}
                                                style={{
                                                    left: `${x}px`,
                                                    top: `${y}px`,
                                                }}
                                            >
                                                {String(minute).padStart(
                                                    2,
                                                    "0"
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Step indicator */}
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <div
                                className={`w-2 h-2 rounded-full transition-colors ${step === "hour" ? "bg-blue-600" : "bg-gray-300"}`}
                            />
                            <div
                                className={`w-2 h-2 rounded-full transition-colors ${step === "minute" ? "bg-blue-600" : "bg-gray-300"}`}
                            />
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-2">
                            {step === "hour"
                                ? "Pilih jam (07–15)"
                                : "Pilih menit"}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
