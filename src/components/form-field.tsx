import { Text, TextInput, View, type TextInputProps } from "react-native";

import { usePalette } from "@/theme";

export function FormField({ label, multiline, ...props }: TextInputProps & { label: string }) {
  const palette = usePalette();
  return (
    <View className="gap-2">
      <Text className="text-sm text-muted">{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={palette.muted}
        textAlignVertical={multiline ? "top" : "center"}
        className={`rounded-2xl bg-card px-4 py-4 text-base text-ink ${multiline ? "min-h-24" : ""}`}
      />
    </View>
  );
}
