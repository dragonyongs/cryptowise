// src/components/ui/Form.jsx
import { forwardRef, useState } from 'react'
import { cn } from '../../utils/cn'

// ========== Base Form Components ==========

export const FormField = ({ children, className, ...props }) => {
    return (
        <div className={cn("space-y-2", className)} {...props}>
            {children}
        </div>
    )
}

export const FormLabel = forwardRef(({ className, ...props }, ref) => {
    return (
        <label
            ref={ref}
            className={cn(
                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                className
            )}
            {...props}
        />
    )
})
FormLabel.displayName = "FormLabel"

export const FormControl = forwardRef(({ className, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={cn("relative", className)}
            {...props}
        />
    )
})
FormControl.displayName = "FormControl"

export const FormDescription = ({ className, ...props }) => {
    return (
        <p
            className={cn("text-sm text-gray-600 dark:text-gray-400", className)}
            {...props}
        />
    )
}

export const FormMessage = ({ className, children, ...props }) => {
    if (!children) return null

    return (
        <p
            className={cn("text-sm font-medium text-red-600 dark:text-red-400", className)}
            {...props}
        >
            {children}
        </p>
    )
}

// ========== Input Components ==========

export const Input = forwardRef(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
                "placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400",
                className
            )}
            ref={ref}
            {...props}
        />
    )
})
Input.displayName = "Input"

export const NumberInput = forwardRef(({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    unit = "",
    placeholder,
    className,
    ...props
}, ref) => {
    return (
        <FormField className={className}>
            <FormLabel>{label}</FormLabel>
            <FormControl>
                <div className="relative">
                    <Input
                        ref={ref}
                        type="number"
                        value={value}
                        onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
                        min={min}
                        max={max}
                        step={step}
                        placeholder={placeholder}
                        className="pr-12"
                        {...props}
                    />
                    {unit && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                            {unit}
                        </span>
                    )}
                </div>
            </FormControl>
        </FormField>
    )
})
NumberInput.displayName = "NumberInput"

// ========== Slider Component ==========

export const SliderInput = ({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    unit = "%",
    tooltip,
    className
}) => {
    return (
        <FormField className={className}>
            <div className="flex justify-between items-center">
                <FormLabel>{label}</FormLabel>
                <span className="text-sm font-medium text-blue-600">
                    {value}{unit}
                </span>
            </div>
            <FormControl>
                <div className="relative">
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={value}
                        onChange={(e) => onChange?.(parseFloat(e.target.value))}
                        className={cn(
                            "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer",
                            "slider:bg-blue-600 slider:rounded-lg slider:border-0",
                            "dark:bg-gray-700",
                            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
                            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer",
                            "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full",
                            "[&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
                        )}
                    />
                </div>
            </FormControl>
            {tooltip && (
                <FormDescription>{tooltip}</FormDescription>
            )}
        </FormField>
    )
}

// ========== Toggle Switch ==========

export const Toggle = ({ checked, onChange, size = "medium", className, ...props }) => {
    const sizeClasses = {
        small: "w-8 h-5",
        medium: "w-11 h-6",
        large: "w-14 h-7"
    }

    const thumbSizeClasses = {
        small: "h-4 w-4",
        medium: "h-5 w-5",
        large: "h-6 w-6"
    }

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange?.(!checked)}
            className={cn(
                "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent",
                "transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                sizeClasses[size],
                checked ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700",
                className
            )}
            {...props}
        >
            <span
                className={cn(
                    "pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out",
                    thumbSizeClasses[size],
                    checked ? "translate-x-5" : "translate-x-0"
                )}
            />
        </button>
    )
}

// ========== Radio Group ==========

export const RadioGroup = ({ value, onChange, options, className }) => {
    return (
        <div className={cn("space-y-2", className)}>
            {options.map((option) => (
                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="radio"
                        value={option.value}
                        checked={value === option.value}
                        onChange={(e) => onChange?.(e.target.value)}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {option.icon && <span className="mr-2">{option.icon}</span>}
                        {option.label}
                    </span>
                </label>
            ))}
        </div>
    )
}

// ========== Select Dropdown ==========

export const Select = forwardRef(({ className, children, ...props }, ref) => {
    return (
        <select
            ref={ref}
            className={cn(
                "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
                className
            )}
            {...props}
        >
            {children}
        </select>
    )
})
Select.displayName = "Select"

// ========== Specialized Components for CryptoWise ==========

export const PrioritySelector = ({ value, onChange, className }) => {
    const priorities = [
        { value: 'high', label: '높음', color: 'text-red-600' },
        { value: 'medium', label: '보통', color: 'text-yellow-600' },
        { value: 'low', label: '낮음', color: 'text-green-600' }
    ]

    return (
        <FormField className={className}>
            <FormLabel>우선순위</FormLabel>
            <Select value={value} onChange={(e) => onChange?.(e.target.value)}>
                {priorities.map(priority => (
                    <option key={priority.value} value={priority.value}>
                        {priority.label}
                    </option>
                ))}
            </Select>
        </FormField>
    )
}

export const RiskLevelSlider = ({ value, onChange, className }) => {
    const getRiskLabel = (level) => {
        if (level <= 3) return '안전'
        if (level <= 6) return '보통'
        if (level <= 8) return '위험'
        return '매우 위험'
    }

    const getRiskColor = (level) => {
        if (level <= 3) return 'text-green-600'
        if (level <= 6) return 'text-yellow-600'
        if (level <= 8) return 'text-orange-600'
        return 'text-red-600'
    }

    return (
        <FormField className={className}>
            <div className="flex justify-between items-center">
                <FormLabel>리스크 레벨</FormLabel>
                <span className={cn("text-sm font-medium", getRiskColor(value))}>
                    {value}/10 ({getRiskLabel(value)})
                </span>
            </div>
            <SliderInput
                value={value}
                onChange={onChange}
                min={1}
                max={10}
                step={1}
                unit=""
            />
        </FormField>
    )
}

export const CorrelationGroupSelect = ({ value, onChange, className }) => {
    const groups = [
        { value: 'defi', label: 'DeFi' },
        { value: 'layer1', label: 'Layer 1' },
        { value: 'layer2', label: 'Layer 2' },
        { value: 'meme', label: 'Meme 코인' },
        { value: 'stablecoin', label: '스테이블코인' },
        { value: 'gaming', label: '게임' },
        { value: 'nft', label: 'NFT' }
    ]

    return (
        <FormField className={className}>
            <FormLabel>상관관계 그룹</FormLabel>
            <Select value={value} onChange={(e) => onChange?.(e.target.value)}>
                <option value="">그룹 선택</option>
                {groups.map(group => (
                    <option key={group.value} value={group.value}>
                        {group.label}
                    </option>
                ))}
            </Select>
        </FormField>
    )
}

// ========== Textarea ==========

export const Textarea = forwardRef(({ className, ...props }, ref) => {
    return (
        <textarea
            ref={ref}
            className={cn(
                "flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
                "placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400",
                className
            )}
            {...props}
        />
    )
})
Textarea.displayName = "Textarea"

// ========== Checkbox ==========

export const Checkbox = forwardRef(({ className, checked, onChange, ...props }, ref) => {
    return (
        <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange?.(e.target.checked)}
            className={cn(
                "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500",
                "dark:border-gray-600 dark:bg-gray-800",
                className
            )}
            {...props}
        />
    )
})
Checkbox.displayName = "Checkbox"

// ========== Collapsible Section ==========

export const Collapsible = ({ title, children, defaultOpen = false, className }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className={cn("border border-gray-200 dark:border-gray-700 rounded-lg", className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800"
            >
                <span className="font-medium">{title}</span>
                <span className={cn("transform transition-transform", isOpen ? "rotate-180" : "")}>
                    ▼
                </span>
            </button>
            {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-700">
                    {children}
                </div>
            )}
        </div>
    )
}

// ========== Export All ==========

export default {
    FormField,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
    Input,
    NumberInput,
    SliderInput,
    Toggle,
    RadioGroup,
    Select,
    PrioritySelector,
    RiskLevelSlider,
    CorrelationGroupSelect,
    Textarea,
    Checkbox,
    Collapsible
}
