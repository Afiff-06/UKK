"use client";

import { useState, useEffect } from "react";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";

interface TimePickerProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    minHour?: number;
    maxHour?: number;
}

export default function TimePicker({
    value,
    onChange,
    label,
    minHour = 7,
    maxHour = 15,
}: TimePickerProps) {
    // Parse current value
    const [h, m] = value ? value.split(":").map(Number) : [8, 0];
    const [hour, setHour] = useState(h);
    const [minute, setMinute] = useState(m);

    // Sync with external value
    useEffect(() => {
        const [newH, newM] = value ? value.split(":").map(Number) : [8, 0];
        setHour(newH);
        setMinute(newM);
    }, [value]);

    const updateTime = (newHour: number, newMinute: number) => {
        // Enforce hour range
        let finalHour = newHour;
        if (finalHour < minHour) finalHour = maxHour;
        if (finalHour > maxHour) finalHour = minHour;

        // Enforce minute range
        let finalMinute = newMinute;
        if (finalMinute < 0) {
            finalMinute = 59;
            finalHour = finalHour - 1 < minHour ? maxHour : finalHour - 1;
        }
        if (finalMinute > 59) {
            finalMinute = 0;
            finalHour = finalHour + 1 > maxHour ? minHour : finalHour + 1;
        }

        const timeString = `${String(finalHour).padStart(2, "0")}:${String(finalMinute).padStart(2, "0")}`;
        onChange(timeString);
    };

    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value) || 0;
        updateTime(val, minute);
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value) || 0;
        updateTime(hour, val);
    };

    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-sm font-semibold text-gray-700 ml-1">
                    {label}
                </label>
            )}
            <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Clock size={20} className="text-blue-600" />
                </div>

                <div className="flex items-center gap-2">
                    {/* Hour Control */}
                    <div className="flex flex-col items-center">
                        <button 
                            onClick={() => updateTime(hour + 1, minute)}
                            className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-blue-600"
                        >
                            <ChevronUp size={16} />
                        </button>
                        <input
                            type="number"
                            value={String(hour).padStart(2, "0")}
                            onChange={handleHourChange}
                            onBlur={() => updateTime(hour, minute)}
                            className="w-14 text-center text-2xl font-bold text-gray-800 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button 
                            onClick={() => updateTime(hour - 1, minute)}
                            className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-blue-600"
                        >
                            <ChevronDown size={16} />
                        </button>
                    </div>

                    <span className="text-2xl font-bold text-gray-300 mb-1">:</span>

                    {/* Minute Control */}
                    <div className="flex flex-col items-center">
                        <button 
                            onClick={() => updateTime(hour, minute + 1)}
                            className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-blue-600"
                        >
                            <ChevronUp size={16} />
                        </button>
                        <input
                            type="number"
                            value={String(minute).padStart(2, "0")}
                            onChange={handleMinuteChange}
                            onBlur={() => updateTime(hour, minute)}
                            className="w-14 text-center text-2xl font-bold text-gray-800 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button 
                            onClick={() => updateTime(hour, minute - 1)}
                            className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-blue-600"
                        >
                            <ChevronDown size={16} />
                        </button>
                    </div>
                </div>

                <div className="ml-auto hidden sm:block">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        {minHour}:00 - {maxHour}:00
                    </span>
                </div>
            </div>
        </div>
    );
}
