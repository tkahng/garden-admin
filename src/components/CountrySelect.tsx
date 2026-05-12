import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { countryOptions } from "@/lib/countries"

type CountrySelectProps = {
  id?: string
  value?: string | null
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  "aria-invalid"?: boolean
}

export function CountrySelect({
  id,
  value,
  onValueChange,
  placeholder = "Select country",
  disabled,
  className,
  "aria-invalid": ariaInvalid,
}: CountrySelectProps) {
  const normalizedValue = value?.trim().toUpperCase() || undefined

  return (
    <Select
      value={normalizedValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className={className ?? "w-full"}
        aria-invalid={ariaInvalid}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {countryOptions.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            {country.name} ({country.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
