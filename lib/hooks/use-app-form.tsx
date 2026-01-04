import { createFormHook, createFormHookContexts } from "@tanstack/react-form"
import {
  ControlledArrayField,
  ControlledInput,
  ControlledSelect,
  ControlledSwitch,
  ControlledTextarea,
  ControlledTextareaWithVoice,
} from "@/components/form-fields"
import { SubscribeButton } from "@/components/subscribe-button"

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
    ControlledArrayField,
  },
  formComponents: {
    SubscribeButton,
  },
})

export { useAppForm }
