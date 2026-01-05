/**
 * Tests for the Card component and its sub-components
 * 
 * Tests cover:
 * - Basic rendering of Card and all sub-components
 * - Size prop functionality (default vs sm)
 * - Custom className merging
 * - Data attributes and accessibility
 * - Component composition
 */

import { describe, expect, it } from "bun:test"
import { renderWithProviders } from "./test-utils"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "../card"

describe("Card", () => {
  describe("Basic Rendering", () => {
    it("renders a card with default props", () => {
      const { container } = renderWithProviders(<Card>Test content</Card>)
      const card = container.querySelector('[data-slot="card"]')
      
      expect(card).toBeTruthy()
      expect(card).toHaveTextContent("Test content")
    })

    it("renders with custom className", () => {
      const { container } = renderWithProviders(
        <Card className="custom-class">Content</Card>
      )
      const card = container.querySelector('[data-slot="card"]')
      
      expect(card).toHaveClass("custom-class")
    })

    it("renders with size prop set to default", () => {
      const { container } = renderWithProviders(
        <Card size="default">Content</Card>
      )
      const card = container.querySelector('[data-slot="card"]')
      
      expect(card).toHaveAttribute("data-size", "default")
    })

    it("renders with size prop set to sm", () => {
      const { container } = renderWithProviders(
        <Card size="sm">Content</Card>
      )
      const card = container.querySelector('[data-slot="card"]')
      
      expect(card).toHaveAttribute("data-size", "sm")
    })

    it("applies size-specific classes when size is sm", () => {
      const { container } = renderWithProviders(
        <Card size="sm">Content</Card>
      )
      const card = container.querySelector('[data-slot="card"]')
      
      // Check for size-specific classes
      expect(card?.className).toContain("data-[size=sm]")
    })
  })

  describe("CardHeader", () => {
    it("renders CardHeader with content", () => {
      const { container } = renderWithProviders(
        <Card>
          <CardHeader>Header content</CardHeader>
        </Card>
      )
      const header = container.querySelector('[data-slot="card-header"]')
      
      expect(header).toBeTruthy()
      expect(header).toHaveTextContent("Header content")
    })

    it("renders CardHeader with custom className", () => {
      const { container } = renderWithProviders(
        <Card>
          <CardHeader className="custom-header">Header</CardHeader>
        </Card>
      )
      const header = container.querySelector('[data-slot="card-header"]')
      
      expect(header).toHaveClass("custom-header")
    })
  })

  describe("CardTitle", () => {
    it("renders CardTitle with text", () => {
      const { container } = renderWithProviders(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
        </Card>
      )
      const title = container.querySelector('[data-slot="card-title"]')
      
      expect(title).toBeTruthy()
      expect(title).toHaveTextContent("Card Title")
    })

    it("renders CardTitle with custom className", () => {
      const { container } = renderWithProviders(
        <Card>
          <CardHeader>
            <CardTitle className="custom-title">Title</CardTitle>
          </CardHeader>
        </Card>
      )
      const title = container.querySelector('[data-slot="card-title"]')
      
      expect(title).toHaveClass("custom-title")
    })
  })

  describe("CardDescription", () => {
    it("renders CardDescription with text", () => {
      const { container } = renderWithProviders(
        <Card>
          <CardHeader>
            <CardDescription>Description text</CardDescription>
          </CardHeader>
        </Card>
      )
      const description = container.querySelector('[data-slot="card-description"]')
      
      expect(description).toBeTruthy()
      expect(description).toHaveTextContent("Description text")
    })

    it("renders CardDescription with custom className", () => {
      const { container } = renderWithProviders(
        <Card>
          <CardHeader>
            <CardDescription className="custom-desc">Description</CardDescription>
          </CardHeader>
        </Card>
      )
      const description = container.querySelector('[data-slot="card-description"]')
      
      expect(description).toHaveClass("custom-desc")
    })
  })

  describe("CardAction", () => {
    it("renders CardAction with content", () => {
      const { container } = renderWithProviders(
        <Card>
          <CardHeader>
            <CardAction>
              <button>Action</button>
            </CardAction>
          </CardHeader>
        </Card>
      )
      const action = container.querySelector('[data-slot="card-action"]')
      
      expect(action).toBeTruthy()
      expect(action).toHaveTextContent("Action")
    })

    it("renders CardAction with custom className", () => {
      const { container } = renderWithProviders(
        <Card>
          <CardHeader>
            <CardAction className="custom-action">
              <button>Action</button>
            </CardAction>
          </CardHeader>
        </Card>
      )
      const action = container.querySelector('[data-slot="card-action"]')
      
      expect(action).toHaveClass("custom-action")
    })
  })

  describe("CardContent", () => {
    it("renders CardContent with content", () => {
      const { container } = renderWithProviders(
        <Card>
          <CardContent>Main content here</CardContent>
        </Card>
      )
      const content = container.querySelector('[data-slot="card-content"]')
      
      expect(content).toBeTruthy()
      expect(content).toHaveTextContent("Main content here")
    })

    it("renders CardContent with custom className", () => {
      const { container } = renderWithProviders(
        <Card>
          <CardContent className="custom-content">Content</CardContent>
        </Card>
      )
      const content = container.querySelector('[data-slot="card-content"]')
      
      expect(content).toHaveClass("custom-content")
    })
  })

  describe("CardFooter", () => {
    it("renders CardFooter with content", () => {
      const { container } = renderWithProviders(
        <Card>
          <CardFooter>Footer content</CardFooter>
        </Card>
      )
      const footer = container.querySelector('[data-slot="card-footer"]')
      
      expect(footer).toBeTruthy()
      expect(footer).toHaveTextContent("Footer content")
    })

    it("renders CardFooter with custom className", () => {
      const { container } = renderWithProviders(
        <Card>
          <CardFooter className="custom-footer">Footer</CardFooter>
        </Card>
      )
      const footer = container.querySelector('[data-slot="card-footer"]')
      
      expect(footer).toHaveClass("custom-footer")
    })
  })

  describe("Component Composition", () => {
    it("renders a complete card with all sub-components", () => {
      const { container } = renderWithProviders(
        <Card size="default">
          <CardHeader>
            <CardTitle>Complete Card</CardTitle>
            <CardDescription>This is a complete card example</CardDescription>
            <CardAction>
              <button>Click me</button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p>This is the main content of the card.</p>
          </CardContent>
          <CardFooter>
            <span>Footer text</span>
          </CardFooter>
        </Card>
      )

      expect(container.querySelector('[data-slot="card"]')).toBeTruthy()
      expect(container.querySelector('[data-slot="card-header"]')).toBeTruthy()
      expect(container.querySelector('[data-slot="card-title"]')).toHaveTextContent("Complete Card")
      expect(container.querySelector('[data-slot="card-description"]')).toHaveTextContent("This is a complete card example")
      expect(container.querySelector('[data-slot="card-action"]')).toHaveTextContent("Click me")
      expect(container.querySelector('[data-slot="card-content"]')).toHaveTextContent("This is the main content of the card.")
      expect(container.querySelector('[data-slot="card-footer"]')).toHaveTextContent("Footer text")
    })

    it("renders a small card with all sub-components", () => {
      const { container } = renderWithProviders(
        <Card size="sm">
          <CardHeader>
            <CardTitle>Small Card</CardTitle>
            <CardDescription>Small card description</CardDescription>
          </CardHeader>
          <CardContent>Small content</CardContent>
          <CardFooter>Small footer</CardFooter>
        </Card>
      )

      const card = container.querySelector('[data-slot="card"]')
      expect(card).toHaveAttribute("data-size", "sm")
      expect(container.querySelector('[data-slot="card-title"]')).toHaveTextContent("Small Card")
    })
  })

  describe("HTML Attributes", () => {
    it("passes through HTML attributes to Card", () => {
      const { container } = renderWithProviders(
        <Card id="test-card" data-testid="card-element" aria-label="Test card">
          Content
        </Card>
      )
      const card = container.querySelector('[data-slot="card"]')
      
      expect(card).toHaveAttribute("id", "test-card")
      expect(card).toHaveAttribute("data-testid", "card-element")
      expect(card).toHaveAttribute("aria-label", "Test card")
    })

    it("passes through HTML attributes to CardContent", () => {
      const { container } = renderWithProviders(
        <Card>
          <CardContent id="content" data-testid="card-content">
            Content
          </CardContent>
        </Card>
      )
      const content = container.querySelector('[data-slot="card-content"]')
      
      expect(content).toHaveAttribute("id", "content")
      expect(content).toHaveAttribute("data-testid", "card-content")
    })
  })
})
