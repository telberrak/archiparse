<?xml version="1.0" encoding="UTF-8"?>
<!--
    Module XSLT - Extraction de Propriétés
    Templates pour extraire les Property Sets (Psets)
-->

<xsl:stylesheet version="2.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:ifc="http://www.buildingsmart-tech.org/ifcXML/IFC4/final"
    xmlns:ifc2x3="http://www.iai-tech.org/ifcXML/IFC2x3/FINAL"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    exclude-result-prefixes="ifc ifc2x3 xlink">

    <xsl:import href="common.xsl"/>

    <!-- Template pour extraire les Property Sets d'un élément -->
    <xsl:template name="ifc:extract-properties">
        <xsl:param name="element" as="element()"/>
        <xsl:param name="all-elements" as="element()*"/>
        
        <map>
            <array key="property_sets">
                <xsl:for-each select="$element//*[local-name()='IsDefinedBy']">
                    <xsl:variable name="ref" select="ifc:extract-reference(.)"/>
                    <xsl:if test="$ref">
                        <xsl:variable name="rel" select="$all-elements[@id=$ref]"/>
                        <xsl:if test="$rel">
                            <xsl:apply-templates select="$rel" mode="ifc:property-set">
                                <xsl:with-param name="all-elements" select="$all-elements"/>
                            </xsl:apply-templates>
                        </xsl:if>
                    </xsl:if>
                </xsl:for-each>
            </array>
        </map>
    </xsl:template>

    <!-- Template pour IfcRelDefinesByProperties -->
    <xsl:template match="*[local-name()='IfcRelDefinesByProperties']" mode="ifc:property-set">
        <xsl:param name="all-elements" as="element()*"/>
        
        <xsl:variable name="prop-def-ref" select="ifc:extract-reference(.//*[local-name()='RelatingPropertyDefinition'])"/>
        <xsl:if test="$prop-def-ref">
            <xsl:variable name="prop-def" select="$all-elements[@id=$prop-def-ref]"/>
            <xsl:if test="$prop-def">
                <xsl:apply-templates select="$prop-def" mode="ifc:property-set-definition">
                    <xsl:with-param name="all-elements" select="$all-elements"/>
                </xsl:apply-templates>
            </xsl:if>
        </xsl:if>
    </xsl:template>

    <!-- Template pour IfcPropertySet -->
    <xsl:template match="*[local-name()='IfcPropertySet']" mode="ifc:property-set-definition">
        <xsl:param name="all-elements" as="element()*"/>
        
        <map>
            <string key="guid"><xsl:value-of select="ifc:extract-guid(.)"/></string>
            <string key="name"><xsl:value-of select="ifc:extract-name(.)"/></string>
            <array key="properties">
                <xsl:for-each select=".//*[local-name()='HasProperties']/*">
                    <xsl:apply-templates select="." mode="ifc:property">
                        <xsl:with-param name="all-elements" select="$all-elements"/>
                    </xsl:apply-templates>
                </xsl:for-each>
            </array>
        </map>
    </xsl:template>

    <!-- Template pour une propriété individuelle -->
    <xsl:template match="*[local-name()='IfcPropertySingleValue']" mode="ifc:property">
        <xsl:param name="all-elements" as="element()*"/>
        
        <map>
            <string key="name"><xsl:value-of select="ifc:extract-name(.)"/></string>
            <xsl:variable name="nominal-value" select=".//*[local-name()='NominalValue']"/>
            <xsl:if test="$nominal-value">
                <string key="value"><xsl:value-of select="normalize-space($nominal-value)"/></string>
            </xsl:if>
        </map>
    </xsl:template>

</xsl:stylesheet>





