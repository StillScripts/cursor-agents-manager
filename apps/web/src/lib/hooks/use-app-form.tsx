import { createFormHook, createFormHookContexts } from "@tanstack/react-form"
import {
  ControlledArrayField,
  ControlledInput,
  ControlledNumberInput,
  ControlledSelect,
  ControlledSwitch,
  ControlledTextarea,
  ControlledTextareaWithVoice,
} from "@/components/forms/core/form-fields"
import { SubscribeButton } from "@/components/forms/core/subscribe-button"

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()

export const FormProvider = formContext.Provider

const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    ControlledInput,
    ControlledTextarea,
    ControlledTextareaWithVoice,
    ControlledSelect,
    ControlledSwitch,
    ControlledNumberInput,
    ControlledArrayField,
  },
  formComponents: {
    SubscribeButton,
  },
})

export { useAppForm }
