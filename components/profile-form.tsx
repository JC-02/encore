import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { AVATAR_IDS } from "../lib/constants";
import { loadProfile } from "../lib/session";
import { NAME_MAX, validateName } from "../lib/validation";
import { useTheme } from "../theme";
import { Avatar } from "./avatar";
import { Body, Label } from "./text";

export interface ProfileValue {
  name: string;
  avatarId: string;
  valid: boolean;
}

interface ProfileFormProps {
  value: ProfileValue;
  onChange: (value: ProfileValue) => void;
}

/** Display name (live-validated, spec §10) + preset avatar picker. */
export function ProfileForm({ value, onChange }: ProfileFormProps) {
  const { colors, radius, sp, font, fontSize } = useTheme();
  const [touched, setTouched] = useState(false);
  const error = validateName(value.name);

  // Prefill from the last game on first mount.
  useEffect(() => {
    loadProfile().then((p) => {
      if (p && !value.name) {
        onChange({ name: p.name, avatarId: p.avatarId, valid: !validateName(p.name) });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setName = (name: string) =>
    onChange({ ...value, name, valid: !validateName(name) });

  return (
    <View style={{ gap: sp(4) }}>
      <View style={{ gap: sp(2) }}>
        <Label uppercase>Your name</Label>
        <TextInput
          value={value.name}
          onChangeText={setName}
          onBlur={() => setTouched(true)}
          maxLength={NAME_MAX}
          placeholder="e.g. DJ Riley"
          placeholderTextColor={colors.faint}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.tile,
            borderWidth: 1,
            borderColor: touched && error ? colors.danger : colors.border,
            color: colors.ink,
            fontFamily: font.bodyMedium,
            fontSize: fontSize.title,
            paddingVertical: sp(3),
            paddingHorizontal: sp(4),
          }}
        />
        {touched && error && (
          <Body size="body" tone="danger">
            {error}
          </Body>
        )}
      </View>
      <View style={{ gap: sp(2) }}>
        <Label uppercase>Avatar</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(3) }}>
          {AVATAR_IDS.map((id) => (
            <Avatar
              key={id}
              avatarId={id}
              size={52}
              selected={value.avatarId === id}
              onPress={() => onChange({ ...value, avatarId: id })}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
