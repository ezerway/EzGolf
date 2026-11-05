import { Text, TextInput, View, type TextInputProps } from "react-native";

import { usePalette } from "@/theme";

export function FormField({ label, multiline, ...props }: TextInputProps & { label: string }) {
  const palette = usePalette();
  return (
    <View className="gap-2">
      <Text className="text-sm" style={{ color: palette.muted }}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={palette.muted}
        underlineColorAndroid="transparent"
        textAlignVertical={multiline ? "top" : "center"}
        className={multiline ? "min-h-24 px-4 py-4 text-base" : "px-4 py-4 text-base"}
        style={{ backgroundColor: palette.card, color: palette.text, borderRadius: 16 }}
      />
    </View>
  );
}
