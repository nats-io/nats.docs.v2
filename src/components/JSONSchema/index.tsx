import React, { useState, useCallback, useEffect } from "react";
import type { JSX } from "react";
import { enumDescriptions } from "@site/src/schemas/enum-descriptions";
import styles from "./styles.module.css";

interface JSONSchemaProperty {
  type?: string | string[];
  const?: any;
  description?: string;
  required?: boolean | string[];
  example?: any;
  properties?: { [key: string]: JSONSchemaProperty };
  additionalProperties?: boolean | JSONSchemaProperty;
  items?: JSONSchemaProperty;
  enum?: any[];
  format?: string;
  default?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  oneOf?: JSONSchemaProperty[];
  anyOf?: JSONSchemaProperty[];
  allOf?: JSONSchemaProperty[];
  $comment?: string;
  deprecationMessage?: string;
  "x-enum-descriptions"?: { [value: string]: string };
}

interface JSONSchemaProps {
  schema: JSONSchemaProperty & {
    $schema?: string;
    $id?: string;
    title?: string;
  };
  title?: string;
}

function getTypeDisplay(property: JSONSchemaProperty): string {
  if (property.const !== undefined) {
    return `const: ${JSON.stringify(property.const)}`;
  }
  if (property.type) {
    if (Array.isArray(property.type)) {
      return property.type.join(" | ");
    }
    if (property.type === "array" && property.items) {
      const itemType = getTypeDisplay(property.items);
      return `${itemType}[]`;
    }
    if (property.format) {
      return `${property.type}<${property.format}>`;
    }
    if (property.type === "object" && property.additionalProperties) {
      if (typeof property.additionalProperties === "object") {
        return `{ [key: string]: ${getTypeDisplay(
          property.additionalProperties
        )} }`;
      }
    }
    return property.type;
  }
  if (property.oneOf) {
    return "oneOf";
  }
  if (property.anyOf) {
    return "anyOf";
  }
  if (property.allOf) {
    return "allOf";
  }
  return "any";
}

function getEnumValueDescription(
  propertyName: string,
  value: any,
  property: JSONSchemaProperty
): string | undefined {
  const key = String(value);
  return (
    property["x-enum-descriptions"]?.[key] ??
    enumDescriptions[propertyName]?.[key]
  );
}

function PropertyRenderer({
  name,
  property,
  isRequired,
  depth = 0,
  expandedState,
  onToggle,
}: {
  name: string;
  property: JSONSchemaProperty;
  isRequired: boolean;
  depth?: number;
  expandedState: Set<string>;
  onToggle: (id: string) => void;
}): JSX.Element {
  const typeDisplay = getTypeDisplay(property);
  const hasNestedContent = !!(
    property.properties ||
    property.oneOf ||
    property.anyOf ||
    property.allOf ||
    (property.type === "array" && property.items?.properties)
  );

  // Create a unique ID for this property based on its path
  const propertyId = `${depth}-${name}`;
  const isExpanded = expandedState.has(propertyId);

  return (
    <div className={styles.property} style={{ marginLeft: `${depth * 24}px` }}>
      <div className={styles.propertyHeader}>
        {hasNestedContent && (
          <button
            className={styles.expandToggle}
            onClick={() => onToggle(propertyId)}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            aria-expanded={isExpanded}
          >
            ▶
          </button>
        )}
        <span className={styles.propertyName}>{name}</span>
        <span className={styles.propertyType}>{typeDisplay}</span>
        {isRequired && <span className={styles.required}>required</span>}
      </div>

      {property.description && (
        <div className={styles.description}>{property.description}</div>
      )}

      {property.$comment && (
        <div className={styles.comment}>{property.$comment}</div>
      )}

      {property.deprecationMessage && (
        <div className={styles.deprecated}>
          Deprecated: {property.deprecationMessage}
        </div>
      )}

      {property.example !== undefined && (
        <div className={styles.example}>
          <span className={styles.exampleLabel}>Example:</span>
          <code className={styles.exampleValue}>
            {typeof property.example === "object"
              ? JSON.stringify(property.example)
              : String(property.example)}
          </code>
        </div>
      )}

      {property.enum &&
        (property.enum.some((value) =>
          getEnumValueDescription(name, value, property)
        ) ? (
          <div className={styles.enum}>
            <span className={styles.enumLabel}>Allowed values:</span>
            <div className={styles.enumGrid}>
              {property.enum.map((value, i) => (
                <React.Fragment key={i}>
                  <code className={styles.enumValue}>
                    {String(value) === "" ? '""' : String(value)}
                  </code>
                  <span className={styles.enumDescription}>
                    {getEnumValueDescription(name, value, property)}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.enum}>
            <span className={styles.enumLabel}>Allowed values:</span>
            {property.enum.map((value, i) => (
              <code key={i} className={styles.enumValue}>
                {String(value) === "" ? '""' : String(value)}
              </code>
            ))}
          </div>
        ))}

      {property.pattern && (
        <div className={styles.pattern}>
          <span className={styles.patternLabel}>Pattern:</span>
          <code className={styles.patternValue}>{property.pattern}</code>
        </div>
      )}

      {property.minimum !== undefined && (
        <div className={styles.constraint}>
          <span className={styles.constraintLabel}>Minimum:</span>
          <code className={styles.constraintValue}>{property.minimum}</code>
        </div>
      )}

      {property.maximum !== undefined && (
        <div className={styles.constraint}>
          <span className={styles.constraintLabel}>Maximum:</span>
          <code className={styles.constraintValue}>{property.maximum}</code>
        </div>
      )}

      {property.minLength !== undefined && (
        <div className={styles.constraint}>
          <span className={styles.constraintLabel}>Min length:</span>
          <code className={styles.constraintValue}>{property.minLength}</code>
        </div>
      )}

      {property.maxLength !== undefined && (
        <div className={styles.constraint}>
          <span className={styles.constraintLabel}>Max length:</span>
          <code className={styles.constraintValue}>{property.maxLength}</code>
        </div>
      )}

      {property.default !== undefined && (
        <div className={styles.default}>
          <span className={styles.defaultLabel}>Default:</span>
          <code className={styles.defaultValue}>
            {typeof property.default === "object"
              ? JSON.stringify(property.default)
              : String(property.default)}
          </code>
        </div>
      )}

      {isExpanded && (
        <>
          {property.oneOf && (
            <div className={styles.oneOf}>
              <div className={styles.schemaVariantLabel}>One of:</div>
              {property.oneOf.map((schema, i) => (
                <div key={i} className={styles.schemaVariant}>
                  <div className={styles.variantHeader}>Option {i + 1}</div>
                  <RenderSchemaProperties 
                    schema={schema} 
                    depth={depth + 1}
                    expandedState={expandedState}
                    onToggle={onToggle}
                  />
                </div>
              ))}
            </div>
          )}

          {property.anyOf && (
            <div className={styles.anyOf}>
              <div className={styles.schemaVariantLabel}>Any of:</div>
              {property.anyOf.map((schema, i) => (
                <div key={i} className={styles.schemaVariant}>
                  <div className={styles.variantHeader}>Option {i + 1}</div>
                  <RenderSchemaProperties 
                    schema={schema} 
                    depth={depth + 1}
                    expandedState={expandedState}
                    onToggle={onToggle}
                  />
                </div>
              ))}
            </div>
          )}

          {property.allOf && (
            <div className={styles.allOf}>
              <div className={styles.schemaVariantLabel}>All of:</div>
              {property.allOf.map((schema, i) => (
                <div key={i} className={styles.schemaVariant}>
                  <RenderSchemaProperties 
                    schema={schema} 
                    depth={depth + 1}
                    expandedState={expandedState}
                    onToggle={onToggle}
                  />
                </div>
              ))}
            </div>
          )}

          {property.properties && (
            <div className={styles.nestedProperties}>
              <RenderSchemaProperties 
                schema={property} 
                depth={depth + 1}
                expandedState={expandedState}
                onToggle={onToggle}
              />
            </div>
          )}

          {property.type === "array" && property.items?.properties && (
            <div className={styles.nestedProperties}>
              <div className={styles.arrayItemsLabel}>Array items:</div>
              <RenderSchemaProperties
                schema={property.items}
                depth={depth + 1}
                expandedState={expandedState}
                onToggle={onToggle}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RenderSchemaProperties({
  schema,
  depth = 0,
  expandedState,
  onToggle,
}: {
  schema: JSONSchemaProperty;
  depth?: number;
  expandedState: Set<string>;
  onToggle: (id: string) => void;
}): JSX.Element | null {
  if (!schema.properties) return null;

  const required = Array.isArray(schema.required) ? schema.required : [];

  return (
    <>
      {Object.entries(schema.properties).map(([propName, propSchema]) => (
        <PropertyRenderer
          key={propName}
          name={propName}
          property={propSchema}
          isRequired={required.includes(propName)}
          depth={depth}
          expandedState={expandedState}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}

// Helper function to find all expandable properties
function findAllExpandableProperties(
  schema: JSONSchemaProperty,
  depth: number = 0,
  prefix: string = ""
): string[] {
  const expandableIds: string[] = [];

  const processProperty = (name: string, property: JSONSchemaProperty, currentDepth: number) => {
    const propertyId = `${currentDepth}-${name}`;
    const hasNestedContent = !!(
      property.properties ||
      property.oneOf ||
      property.anyOf ||
      property.allOf ||
      (property.type === "array" && property.items?.properties)
    );

    if (hasNestedContent) {
      expandableIds.push(propertyId);

      // Recursively find nested expandable properties
      if (property.properties) {
        Object.entries(property.properties).forEach(([nestedName, nestedProp]) => {
          expandableIds.push(...findAllExpandableProperties({ properties: { [nestedName]: nestedProp } }, currentDepth + 1));
        });
      }

      // Handle schema variants
      const variants = [...(property.oneOf || []), ...(property.anyOf || []), ...(property.allOf || [])];
      variants.forEach((variant) => {
        if (variant.properties) {
          expandableIds.push(...findAllExpandableProperties(variant, currentDepth + 1));
        }
      });

      // Handle array items
      if (property.type === "array" && property.items?.properties) {
        expandableIds.push(...findAllExpandableProperties(property.items, currentDepth + 1));
      }
    }
  };

  if (schema.properties) {
    Object.entries(schema.properties).forEach(([name, property]) => {
      processProperty(name, property, depth);
    });
  }

  // Handle root-level schema variants
  const rootVariants = [...(schema.oneOf || []), ...(schema.anyOf || []), ...(schema.allOf || [])];
  rootVariants.forEach((variant) => {
    if (variant.properties) {
      expandableIds.push(...findAllExpandableProperties(variant, depth));
    }
  });

  return expandableIds;
}

export default function JSONSchema({ schema }: JSONSchemaProps): JSX.Element {
  const [expandedState, setExpandedState] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  // Find all expandable properties
  const allExpandableIds = findAllExpandableProperties(schema);

  const handleToggle = useCallback((id: string) => {
    setExpandedState(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    if (allExpanded) {
      setExpandedState(new Set());
      setAllExpanded(false);
    } else {
      setExpandedState(new Set(allExpandableIds));
      setAllExpanded(true);
    }
  }, [allExpanded, allExpandableIds]);

  // Update allExpanded state when individual items are toggled
  useEffect(() => {
    if (allExpandableIds.length > 0) {
      const allAreExpanded = allExpandableIds.every(id => expandedState.has(id));
      setAllExpanded(allAreExpanded);
    }
  }, [expandedState, allExpandableIds]);

  const required = Array.isArray(schema.required) ? schema.required : [];

  return (
    <div className={styles.schemaContainer}>
      {schema.description && (
        <p className={styles.schemaDescription}>{schema.description}</p>
      )}

      {allExpandableIds.length > 0 && (
        <div className={styles.expandAllContainer}>
          <button
            className={styles.expandAllButton}
            onClick={handleExpandAll}
            aria-label={allExpanded ? "Collapse all properties" : "Expand all properties"}
          >
            {allExpanded ? "Collapse All" : "Expand All"}
          </button>
        </div>
      )}

      <div className={styles.propertiesContainer}>
        {/* Handle root-level oneOf */}
        {schema.oneOf && (
          <div className={styles.rootOneOf}>
            <div className={styles.schemaVariantLabel}>
              One of the following:
            </div>
            {schema.oneOf.map((variant, i) => (
              <div key={i} className={styles.schemaVariant}>
                <div className={styles.variantHeader}>
                  Option {i + 1}
                  {variant.type && (
                    <span className={styles.variantType}>
                      {" "}
                      ({variant.type})
                    </span>
                  )}
                </div>
                {variant.description && (
                  <div className={styles.description}>
                    {variant.description}
                  </div>
                )}
                <RenderSchemaProperties 
                  schema={variant} 
                  depth={0}
                  expandedState={expandedState}
                  onToggle={handleToggle}
                />
              </div>
            ))}
          </div>
        )}

        {/* Handle root-level anyOf */}
        {schema.anyOf && (
          <div className={styles.rootAnyOf}>
            <div className={styles.schemaVariantLabel}>
              Any of the following:
            </div>
            {schema.anyOf.map((variant, i) => (
              <div key={i} className={styles.schemaVariant}>
                <div className={styles.variantHeader}>
                  Option {i + 1}
                  {variant.type && (
                    <span className={styles.variantType}>
                      {" "}
                      ({variant.type})
                    </span>
                  )}
                </div>
                {variant.description && (
                  <div className={styles.description}>
                    {variant.description}
                  </div>
                )}
                <RenderSchemaProperties 
                  schema={variant} 
                  depth={0}
                  expandedState={expandedState}
                  onToggle={handleToggle}
                />
              </div>
            ))}
          </div>
        )}

        {/* Handle root-level allOf */}
        {schema.allOf && (
          <div className={styles.rootAllOf}>
            <div className={styles.schemaVariantLabel}>
              All of the following:
            </div>
            {schema.allOf.map((variant, i) => (
              <div key={i} className={styles.schemaVariant}>
                {variant.description && (
                  <div className={styles.description}>
                    {variant.description}
                  </div>
                )}
                <RenderSchemaProperties 
                  schema={variant} 
                  depth={0}
                  expandedState={expandedState}
                  onToggle={handleToggle}
                />
              </div>
            ))}
          </div>
        )}

        {/* Handle regular properties */}
        {schema.properties &&
          Object.entries(schema.properties).map(([name, property]) => (
            <PropertyRenderer
              key={name}
              name={name}
              property={property}
              isRequired={required.includes(name)}
              depth={0}
              expandedState={expandedState}
              onToggle={handleToggle}
            />
          ))}
      </div>
    </div>
  );
}